import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, X } from 'lucide-react';
import { api } from '../api';

interface Props {
  documentId: string;
  onBookmarkAdded?: () => void;
}

export default function BookmarkButton({ documentId, onBookmarkAdded }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleBookmark = async () => {
    if (showForm) {
      // Save bookmark
      setSaving(true);
      try {
        const scrollPercent = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        await api.bookmarks.create({
          document_id: documentId,
          position: {
            type: 'scroll',
            scrollPercent,
          },
          label: label || undefined,
        });
        // Update reading history
        await api.reading.update(documentId, {
          type: 'scroll',
          scrollPercent,
        });
        setSaved(true);
        setShowForm(false);
        setLabel('');
        onBookmarkAdded?.();
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error('Failed to bookmark:', err);
      } finally {
        setSaving(false);
      }
    } else {
      setShowForm(true);
    }
  };

  return (
    <div className="relative">
      {showForm && (
        <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-3 shadow-xl w-64 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#e2e2f0]">Add bookmark</span>
            <button onClick={() => setShowForm(false)} className="text-[#7a7a9a] hover:text-[#e2e2f0]">
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full bg-[#0f0f13] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-[#e2e2f0] placeholder:text-[#7a7a9a] outline-none focus:border-purple-500 mb-2"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleBookmark(); if (e.key === 'Escape') setShowForm(false); }}
          />
          <button
            onClick={handleBookmark}
            disabled={saving}
            className="w-full py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save bookmark'}
          </button>
        </div>
      )}

      <button
        onClick={handleBookmark}
        title="Bookmark this position"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
          saved
            ? 'bg-green-900/40 text-green-300 border border-green-700'
            : showForm
            ? 'bg-purple-800/60 text-purple-200 border border-purple-600'
            : 'bg-[#1a1a24] text-[#9a9ab8] border border-[#2a2a3a] hover:border-purple-600 hover:text-purple-300'
        }`}
      >
        {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        {saved ? 'Saved!' : 'Bookmark'}
      </button>
    </div>
  );
}
