import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchDocs, uploadDoc, deleteDoc, Doc } from './api';

export default function App() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (tagFilter) params.tag = tagFilter;
      const data = await fetchDocs(params);
      setDocs(data.docs);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load docs:', err);
    }
    setLoading(false);
  }, [search, tagFilter]);

  useEffect(() => {
    const timer = setTimeout(loadDocs, 300);
    return () => clearTimeout(timer);
  }, [loadDocs]);

  // Collect all unique tags
  const allTags = Array.from(new Set(
    docs.flatMap(d => d.tags ? d.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
  )).sort();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        await uploadDoc(file);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
    loadDocs();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await deleteDoc(id);
    loadDocs();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="min-h-screen bg-crown-bg">
      {/* Header */}
      <header className="border-b border-crown-border bg-crown-surface sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>📚</span>
            <span>Crown<span className="text-crown-accent">Library</span></span>
          </h1>
          <div className="text-crown-muted text-sm">{total} documents</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-crown-surface border border-crown-border rounded-lg px-4 py-2.5 text-crown-text placeholder-crown-muted focus:outline-none focus:border-crown-accent transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-crown-muted hover:text-crown-accent"
              >✕</button>
            )}
          </div>
          {allTags.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => setTagFilter('')}
                className={`px-3 py-1.5 rounded-full text-sm transition ${!tagFilter ? 'bg-crown-accent text-white' : 'bg-crown-surface border border-crown-border text-crown-muted hover:text-crown-text'}`}
              >All</button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${tag === tagFilter ? 'bg-crown-accent text-white' : 'bg-crown-surface border border-crown-border text-crown-muted hover:text-crown-text'}`}
                >{tag}</button>
              ))}
            </div>
          )}
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 mb-6 text-center transition ${dragOver ? 'border-crown-accent bg-crown-accent/5' : 'border-crown-border'}`}
        >
          <p className="text-crown-muted mb-2">
            {uploading ? '⏳ Uploading...' : '📄 Drop markdown files here or'}
          </p>
          <label className="inline-block px-4 py-2 bg-crown-accent text-white rounded-lg cursor-pointer hover:bg-crown-accent/80 transition">
            Browse Files
            <input
              type="file"
              accept=".md,.txt,.markdown"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </label>
        </div>

        {/* Document List */}
        {loading ? (
          <div className="text-center py-12 text-crown-muted">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-crown-muted">
              {search ? `No results for "${search}"` : 'No documents yet. Add some!'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {docs.map(doc => (
              <Link
                key={doc.id}
                to={`/doc/${doc.id}`}
                className="block bg-crown-surface border border-crown-border rounded-lg p-4 hover:border-crown-accent/50 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-crown-text group-hover:text-crown-accent transition truncate">
                      {doc.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-crown-muted">
                      <span>{new Date(doc.created_at + 'Z').toLocaleDateString()}</span>
                      <span>{formatSize(doc.content_length)}</span>
                      {doc.tags && (
                        <div className="flex gap-1">
                          {doc.tags.split(',').filter(Boolean).map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-crown-bg rounded-full text-xs">{tag.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(doc.id, doc.title); }}
                    className="ml-3 text-crown-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                    title="Delete"
                  >🗑️</button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
