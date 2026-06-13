import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchDoc, addBookmark, deleteBookmark, markDocOpened, archiveDoc, unarchiveDoc, Doc } from './api';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function downloadTextFile(filename: string, content: string, mimeType = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(title: string) {
  return title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
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
  const [shareState, setShareState] = useState('');
  const [archiveBusy, setArchiveBusy] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchDoc(id)
      .then(async d => {
        setDoc(d);
        // Fire-and-forget recent tracking
        markDocOpened(id).catch(() => {});

        const headings: TocItem[] = [];
        const lines = d.content_md.split('\n');
        for (const line of lines) {
          const match = line.match(/^(#{1,4})\s+(.+)/);
          if (match) {
            const text = match[2].replace(/[*_`#]/g, '').trim();
            headings.push({ id: slugify(text), text, level: match[1].length });
          }
        }
        setToc(headings);
      })
      .catch(() => setError('Document not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!doc?.bookmarks?.length || !contentRef.current) return;
    const latest = [...doc.bookmarks].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (latest.scroll_pos > 0) {
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: latest.scroll_pos, behavior: 'smooth' });
      }, 500);
    } else if (latest.section) {
      setTimeout(() => {
        const el = document.getElementById(slugify(latest.section));
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [doc]);

  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const headingEls = contentRef.current.querySelectorAll('h1, h2, h3, h4');
    let current = '';
    for (const el of Array.from(headingEls)) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 120) current = el.id;
    }
    if (current !== activeSection) setActiveSection(current);
  }, [activeSection]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!shareState) return;
    const timer = setTimeout(() => setShareState(''), 2000);
    return () => clearTimeout(timer);
  }, [shareState]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBookmark = async () => {
    if (!doc || !id) return;
    const scrollPos = contentRef.current?.scrollTop || 0;
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

  const handleExportMarkdown = () => {
    if (!doc) return;
    downloadTextFile(`${safeFilename(doc.title)}.md`, doc.content_md);
  };

  const handleShare = async () => {
    if (!doc) return;
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: doc.title, url: shareUrl });
        setShareState('Shared');
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareState('Link copied');
    } catch {
      setShareState('Share failed');
    }
  };

  const handleArchiveToggle = async () => {
    if (!doc || !id) return;
    setArchiveBusy(true);
    try {
      const updated = doc.archived ? await unarchiveDoc(id) : await archiveDoc(id);
      setDoc({ ...doc, ...updated });
    } finally {
      setArchiveBusy(false);
    }
  };

  const HeadingRenderer = ({ level, children }: { level: number; children: React.ReactNode }) => {
    const text = String(children).replace(/[*_`#]/g, '').trim();
    const slug = slugify(text);
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    return <Tag id={slug}>{children}</Tag>;
  };

  const tags = doc?.tags ? doc.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
  const folderParts = doc?.folder ? doc.folder.split('/').filter(Boolean) : [];

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
      <header className="border-b border-crown-border bg-crown-surface sticky top-0 z-20">
        <div className="max-w-full px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-crown-muted hover:text-crown-accent transition">
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{doc.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-crown-muted">
              {folderParts.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {folderParts.map((part, index) => (
                    <React.Fragment key={`${part}-${index}`}>
                      {index > 0 && <span>/</span>}
                      <span className="px-2 py-0.5 rounded-full bg-crown-bg border border-crown-border">{part}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
              {doc.archived ? <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">Archived</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {bookmarkSaved && <span className="text-green-400 text-sm">✅ Saved!</span>}
            {shareState && <span className="text-crown-accent text-sm">{shareState}</span>}
            <button
              onClick={handleShare}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition"
            >🔗 Share</button>
            <button
              onClick={handleExportMarkdown}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition"
            >📝 Markdown</button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition"
            >📄 PDF</button>
            <button
              onClick={handleArchiveToggle}
              disabled={archiveBusy}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition disabled:opacity-50"
            >{doc.archived ? '📂 Unarchive' : '🗃️ Archive'}</button>
            <button
              onClick={() => setShowBookmarkForm(!showBookmarkForm)}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition"
              title="Bookmark current position"
            >📌 Bookmark</button>
            <button
              onClick={() => setShowToc(!showToc)}
              className="px-3 py-1.5 bg-crown-surface border border-crown-border rounded-lg text-sm hover:border-crown-accent transition sm:hidden"
            >☰</button>
          </div>
        </div>
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
                              scrollToSection(slugify(bm.section));
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

        <div ref={contentRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-3xl mx-auto prose-crown">
            {tags.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-crown-surface/70 border border-crown-border rounded-full text-xs text-crown-muted">
                    {tag}
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
