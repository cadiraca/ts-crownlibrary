import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Bookmark, Clock, FileText, Tag, Trash2, Download, Crown, Calendar } from 'lucide-react';
import { api } from '../api';
import { Document, Bookmark as BookmarkType } from '../types';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<Document | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [docData, bmData] = await Promise.all([
        api.documents.get(id),
        api.bookmarks.list(id).catch(() => [] as BookmarkType[]),
      ]);
      setDoc(docData);
      setBookmarks(bmData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const deleteBookmark = async (bmId: string) => {
    try {
      await api.bookmarks.delete(bmId);
      setBookmarks(prev => prev.filter(b => b.id !== bmId));
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const deleteDoc = async () => {
    if (!doc || !confirm(`Delete "${doc.title}"?`)) return;
    try {
      await api.documents.delete(doc.id);
      navigate('/');
    } catch (err) {
      alert(String(err));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
      <div className="text-[#7a7a9a]">Loading...</div>
    </div>
  );

  if (error || !doc) return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
      <p className="text-red-400">{error || 'Not found'}</p>
    </div>
  );

  const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f13]/95 backdrop-blur border-b border-[#2a2a3a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1.5 text-[#7a7a9a] hover:text-[#e2e2f0] transition-colors">
              <ArrowLeft size={16} />
              <span className="text-sm">Library</span>
            </Link>
            <div className="flex items-center gap-1">
              <Crown size={14} className="text-purple-400" />
              <span className="text-sm text-[#7a7a9a]">Document Details</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-[#e2e2f0] mb-2">{doc.title}</h1>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-900/30 text-purple-300 rounded-full border border-purple-800/50">
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: FileText, label: 'Words', value: doc.word_count.toLocaleString() },
            { icon: Clock, label: 'Read time', value: `${doc.reading_time_min} min` },
            { icon: Calendar, label: 'Added', value: new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            { icon: Calendar, label: 'Updated', value: new Date(doc.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[#7a7a9a] text-xs mb-1">
                <Icon size={12} />
                {label}
              </div>
              <div className="text-[#e2e2f0] font-semibold text-sm">{value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            to={`/read/${doc.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <BookOpen size={15} />
            Read Now
          </Link>
          <a
            href={api.documents.mdUrl(doc.id)}
            download
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a24] hover:bg-[#252535] text-[#9a9ab8] border border-[#2a2a3a] rounded-xl text-sm transition-colors"
          >
            <Download size={15} />
            Download .md
          </a>
          <a
            href={api.documents.pdfUrl(doc.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a24] hover:bg-[#252535] text-[#9a9ab8] border border-[#2a2a3a] rounded-xl text-sm transition-colors"
          >
            <FileText size={15} />
            Export PDF
          </a>
          <button
            onClick={deleteDoc}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800/50 rounded-xl text-sm transition-colors ml-auto"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>

        {/* Bookmarks */}
        <section>
          <h2 className="text-base font-semibold text-[#e2e2f0] mb-3 flex items-center gap-2">
            <Bookmark size={16} className="text-purple-400" />
            Bookmarks ({bookmarks.length})
          </h2>

          {bookmarks.length === 0 ? (
            <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6 text-center">
              <Bookmark size={24} className="text-[#2a2a3a] mx-auto mb-2" />
              <p className="text-[#7a7a9a] text-sm">No bookmarks yet</p>
              <p className="text-[#5a5a7a] text-xs mt-1">Use the Bookmark button while reading</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map(bm => {
                const pos = typeof bm.position === 'string' ? JSON.parse(bm.position) : bm.position;
                const posLabel = pos?.sectionId
                  ? `§ ${pos.sectionId}`
                  : pos?.scrollPercent != null
                  ? `${Math.round(pos.scrollPercent)}% through`
                  : 'Beginning';
                const date = new Date(bm.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                return (
                  <div key={bm.id} className="flex items-center gap-3 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl px-4 py-3">
                    <Bookmark size={14} className="text-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {bm.label && <p className="text-sm text-[#e2e2f0] font-medium">{bm.label}</p>}
                      <p className="text-xs text-[#7a7a9a]">{posLabel} · {date}</p>
                    </div>
                    <Link
                      to={`/read/${doc.id}`}
                      className="text-xs px-2.5 py-1 bg-purple-900/30 text-purple-300 rounded-lg hover:bg-purple-800/40 transition-colors"
                    >
                      Jump
                    </Link>
                    <button
                      onClick={() => deleteBookmark(bm.id)}
                      className="text-[#7a7a9a] hover:text-red-400 transition-colors"
                      title="Remove bookmark"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
