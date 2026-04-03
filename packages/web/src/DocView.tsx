import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchDoc, addBookmark, deleteBookmark, Doc, Bookmark } from './api';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function DocView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeSection, setActiveSection] = useState('');
  const [showToc, setShowToc] = useState(true);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchDoc(id)
      .then(d => {
        setDoc(d);
        // Extract TOC from markdown headings
        const headings: TocItem[] = [];
        const lines = d.content_md.split('\n');
        for (const line of lines) {
          const match = line.match(/^(#{1,4})\s+(.+)/);
          if (match) {
            const text = match[2].replace(/[*_`#]/g, '').trim();
            const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            headings.push({ id: slug, text, level: match[1].length });
          }
        }
        setToc(headings);
      })
      .catch(() => setError('Document not found'))
      .finally(() => setLoading(false));
  }, [id]);

  // Resume reading: scroll to last bookmark
  useEffect(() => {
    if (!doc?.bookmarks?.length || !contentRef.current) return;
    const latest = doc.bookmarks.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (latest.scroll_pos > 0) {
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: latest.scroll_pos, behavior: 'smooth' });
      }, 500);
    } else if (latest.section) {
      setTimeout(() => {
        const slug = latest.section.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const el = document.getElementById(slug);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [doc]);

  // Scroll tracking for TOC highlighting
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const headingEls = contentRef.current.querySelectorAll('h1, h2, h3, h4');
    let current = '';
    for (const el of Array.from(headingEls)) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 120) {
        current = el.id;
      }
    }
    if (current !== activeSection) setActiveSection(current);
  }, [activeSection]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBookmark = async () => {
    if (!doc || !id) return;
    const scrollPos = contentRef.current?.scrollTop || 0;
    // Find current section
    const currentSection = toc.find(t => t.id === activeSection)?.text || '';

    await addBookmark(id, {
      section: currentSection,
      scroll_pos: scrollPos,
      note: bookmarkNote || `Reading at ${currentSection || 'top'}`
    });

    setBookmarkSaved(true);
    setShowBookmarkForm(false);
    setBookmarkNote('');
    setTimeout(() => setBookmarkSaved(false), 2000);

    // Refresh doc
    const refreshed = await fetchDoc(id);
    setDoc(refreshed);
  };

  const handleDeleteBookmark = async (bmId: string) => {
    if (!id) return;
    await deleteBookmark(id, bmId);
    const refreshed = await fetchDoc(id);
    setDoc(refreshed);
  };

  const handleExportPdf = () => {
    if (!id) return;
    window.open(`/api/docs/${id}/export/pdf`, '_blank');
  };

  // Custom heading renderer that adds IDs
  const HeadingRenderer = ({ level, children }: { level: number; children: React.ReactNode }) => {
    const text = String(children).replace(/[*_`#]/g, '').trim();
    const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    return <Tag id={slug}>{children}</Tag>;
  };

  if (loading) return <div className="min-h-screen bg-crown-bg flex items-center justify-center text-crown-muted">Loading...</div>;
  if (error || !doc) return (
    <div className="min-h-screen bg-crown-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">📚</div>
        <p className="text-crown-muted mb-4">{error || 'Not found'}</p>
        <button onClick={() => navigate('/')} className="text-crown-accent hover:underline">← Back to Library</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-crown-bg flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-crown-border bg-crown-surface sticky top-0 z-20">
        <div className="max-w-full px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-crown-muted hover:text-crown-accent transition">
            ← Back
          </button>
          <h1 className="flex-1 font-semibold truncate">{doc.title}</h1>
          <div className="flex items-center gap-2">
            {bookmarkSaved && <span className="text-green-400 text-sm">✅ Saved!</span>}
            <button
              onClick={() => setShowBookmarkForm(!showBookmarkForm)}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition"
              title="Bookmark current position"
            >📌 Bookmark</button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition"
            >📄 PDF</button>
            <button
              onClick={() => setShowToc(!showToc)}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition sm:hidden"
            >☰</button>
          </div>
        </div>
        {/* Bookmark form */}
        {showBookmarkForm && (
          <div className="px-4 py-3 border-t border-crown-border bg-crown-bg flex gap-2 items-center">
            <input
              type="text"
              placeholder="Note (optional)..."
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              className="flex-1 bg-crown-surface border border-crown-border rounded px-3 py-1.5 text-sm text-crown-text placeholder-crown-muted focus:outline-none focus:border-crown-accent"
              onKeyDown={(e) => e.key === 'Enter' && handleBookmark()}
            />
            <button onClick={handleBookmark} className="px-4 py-1.5 bg-crown-accent text-white rounded text-sm hover:bg-crown-accent/80">
              📌 Save Here
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* TOC Sidebar */}
        {showToc && toc.length > 0 && (
          <aside className="w-64 min-w-[200px] border-r border-crown-border bg-crown-surface overflow-y-auto hidden sm:block">
            <div className="p-4">
              <h3 className="text-xs uppercase text-crown-muted font-semibold mb-3 tracking-wider">Contents</h3>
              <nav className="space-y-1">
                {toc.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left text-sm py-1 border-l-2 transition truncate ${
                      item.id === activeSection
                        ? 'toc-active border-l-crown-accent text-crown-accent pl-3'
                        : 'border-l-transparent text-crown-muted hover:text-crown-text pl-3'
                    }`}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>

              {/* Bookmarks list */}
              {doc.bookmarks && doc.bookmarks.length > 0 && (
                <div className="mt-6 pt-4 border-t border-crown-border">
                  <h3 className="text-xs uppercase text-crown-muted font-semibold mb-3 tracking-wider">Bookmarks</h3>
                  <div className="space-y-2">
                    {doc.bookmarks.map(bm => (
                      <div key={bm.id} className="group flex items-start gap-1">
                        <button
                          onClick={() => {
                            if (bm.scroll_pos) {
                              contentRef.current?.scrollTo({ top: bm.scroll_pos, behavior: 'smooth' });
                            } else if (bm.section) {
                              const slug = bm.section.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                              scrollToSection(slug);
                            }
                          }}
                          className="flex-1 text-left text-xs text-crown-muted hover:text-crown-accent transition"
                        >
                          📌 {bm.note || bm.section || 'Bookmark'}
                        </button>
                        <button
                          onClick={() => handleDeleteBookmark(bm.id)}
                          className="text-xs text-crown-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-3xl mx-auto prose-crown">
            {doc.tags && (
              <div className="flex gap-2 mb-4">
                {doc.tags.split(',').filter(Boolean).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-crown-surface border border-crown-border rounded-full text-xs text-crown-muted">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <HeadingRenderer level={1}>{children}</HeadingRenderer>,
                h2: ({ children }) => <HeadingRenderer level={2}>{children}</HeadingRenderer>,
                h3: ({ children }) => <HeadingRenderer level={3}>{children}</HeadingRenderer>,
                h4: ({ children }) => <HeadingRenderer level={4}>{children}</HeadingRenderer>,
              }}
            >
              {doc.content_md}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
