import React, { useEffect, useState, useCallback } from 'react';
import { Search, Crown, Grid, List, Tag, SortAsc, SortDesc, RefreshCw } from 'lucide-react';
import DocCard from '../components/DocCard';
import { api } from '../api';
import { Document } from '../types';

type ViewMode = 'grid' | 'list';
type SortMode = 'created_at' | 'title';

export default function Library() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortMode>('created_at');

  const allTags = Array.from(
    new Set(docs.flatMap(d => d.tags ? d.tags.split(',').filter(Boolean) : []))
  ).sort();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.documents.list({
        search: search || undefined,
        tag: activeTag || undefined,
        sort,
      });
      setDocs(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [search, activeTag, sort]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f13]/95 backdrop-blur border-b border-[#2a2a3a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Crown size={22} className="text-purple-400" />
              <span className="font-bold text-lg text-[#e2e2f0]">CrownLibrary</span>
            </div>

            {/* Search */}
            <div className="flex-1 relative max-w-xl">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a7a9a]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#e2e2f0] placeholder:text-[#7a7a9a] outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setSort(s => s === 'created_at' ? 'title' : 'created_at')}
                title={sort === 'created_at' ? 'Sort by date' : 'Sort by title'}
                className="p-2 text-[#7a7a9a] hover:text-[#e2e2f0] hover:bg-[#1a1a24] rounded-lg transition-colors"
              >
                {sort === 'created_at' ? <SortDesc size={16} /> : <SortAsc size={16} />}
              </button>
              <button
                onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                className="p-2 text-[#7a7a9a] hover:text-[#e2e2f0] hover:bg-[#1a1a24] rounded-lg transition-colors"
              >
                {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
              </button>
              <button
                onClick={load}
                className="p-2 text-[#7a7a9a] hover:text-[#e2e2f0] hover:bg-[#1a1a24] rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTag('')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                !activeTag
                  ? 'bg-purple-700 text-white border-purple-600'
                  : 'bg-[#1a1a24] text-[#9a9ab8] border-[#2a2a3a] hover:border-purple-600'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeTag === tag
                    ? 'bg-purple-700 text-white border-purple-600'
                    : 'bg-[#1a1a24] text-[#9a9ab8] border-[#2a2a3a] hover:border-purple-600'
                }`}
              >
                <Tag size={10} />
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#7a7a9a]">
            {loading ? 'Loading...' : `${docs.length} document${docs.length !== 1 ? 's' : ''}`}
            {activeTag && ` tagged "${activeTag}"`}
            {search && ` matching "${search}"`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && docs.length === 0 && (
          <div className="text-center py-20">
            <Crown size={40} className="text-[#2a2a3a] mx-auto mb-4" />
            <p className="text-[#7a7a9a] text-lg font-medium">No documents yet</p>
            <p className="text-[#5a5a7a] text-sm mt-2">
              Use <code className="bg-[#1a1a24] px-2 py-0.5 rounded text-purple-300">cl add</code> to add your first document
            </p>
          </div>
        )}

        {/* Grid / List */}
        {!loading && docs.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map(doc => <DocCard key={doc.id} doc={doc} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => (
                <DocCard key={doc.id} doc={doc} />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
