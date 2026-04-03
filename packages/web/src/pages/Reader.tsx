import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Tag, Download, FileText, Crown } from 'lucide-react';
import { api } from '../api';
import { Document, ReadingHistory } from '../types';
import MarkdownViewer from '../components/MarkdownViewer';
import TOCSidebar from '../components/TOCSidebar';
import BookmarkButton from '../components/BookmarkButton';
import ContinueReading from '../components/ContinueReading';
import ReadingProgress from '../components/ReadingProgress';

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<Document | null>(null);
  const [history, setHistory] = useState<ReadingHistory | null>(null);
  const [showContinue, setShowContinue] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [docData, histData] = await Promise.all([
          api.documents.get(id),
          api.reading.get(id).catch(() => null),
        ]);
        setDoc(docData);
        setHistory(histData);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Track scroll position and save to reading history
  useEffect(() => {
    if (!id || !doc) return;

    const onScroll = () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
      progressTimer.current = setTimeout(async () => {
        const scrollPercent = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        try {
          const updated = await api.reading.update(id, { type: 'scroll', scrollPercent });
          setHistory(updated);
        } catch { /* silent */ }
      }, 2000);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (progressTimer.current) clearTimeout(progressTimer.current);
    };
  }, [id, doc]);

  const handleJump = useCallback((pos: ReadingHistory['last_position']) => {
    if (!pos) return;
    setShowContinue(false);

    if (pos.sectionId) {
      const el = document.getElementById(pos.sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    if (typeof pos.scrollPercent === 'number') {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: total * (pos.scrollPercent / 100), behavior: 'smooth' });
    }
  }, []);

  const refreshBookmarks = useCallback(() => {}, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
      <div className="text-[#7a7a9a]">Loading...</div>
    </div>
  );

  if (error || !doc) return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error || 'Document not found'}</p>
        <button onClick={() => navigate('/')} className="text-purple-400 hover:text-purple-300">
          ← Back to library
        </button>
      </div>
    </div>
  );

  const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <ReadingProgress />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f13]/95 backdrop-blur border-b border-[#2a2a3a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1.5 text-[#7a7a9a] hover:text-[#e2e2f0] transition-colors">
              <ArrowLeft size={16} />
              <span className="text-sm">Library</span>
            </Link>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#e2e2f0] truncate">{doc.title}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center gap-1 text-xs text-[#7a7a9a]">
                <Clock size={12} />
                {doc.reading_time_min} min
              </span>
              <BookmarkButton documentId={doc.id} onBookmarkAdded={refreshBookmarks} />
              <a
                href={api.documents.mdUrl(doc.id)}
                download
                className="flex items-center gap-1 px-2.5 py-2 text-[#7a7a9a] hover:text-[#e2e2f0] bg-[#1a1a24] border border-[#2a2a3a] rounded-lg text-xs transition-colors"
                title="Download Markdown"
              >
                <Download size={13} />
              </a>
              <Link
                to={`/doc/${doc.id}`}
                className="flex items-center gap-1 px-2.5 py-2 text-[#7a7a9a] hover:text-[#e2e2f0] bg-[#1a1a24] border border-[#2a2a3a] rounded-lg text-xs transition-colors"
                title="Document details"
              >
                <FileText size={13} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8">
          {/* TOC sidebar */}
          <aside className="hidden xl:block w-56 flex-shrink-0">
            <TOCSidebar content={doc.content} />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 max-w-3xl">
            {/* Title + meta */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#e2e2f0] mb-3">{doc.title}</h1>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-900/30 text-purple-300 rounded-full border border-purple-800/50">
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-[#7a7a9a]">
                {doc.word_count.toLocaleString()} words · {doc.reading_time_min} min read ·
                Added {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Continue reading banner */}
            {history && showContinue && (
              <ContinueReading
                history={history}
                onJump={handleJump}
                onDismiss={() => setShowContinue(false)}
              />
            )}

            {/* Markdown content */}
            <MarkdownViewer content={doc.content} />
          </main>
        </div>
      </div>
    </div>
  );
}
