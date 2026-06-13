import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchDocs, uploadDoc, deleteDoc, archiveDoc, unarchiveDoc, Doc } from './api';

type ViewMode = 'all' | 'recent' | 'archived';
type SortMode = 'updated' | 'created' | 'recent';

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(date?: string | null) {
  if (!date) return '';
  return new Date(`${date}Z`).toLocaleDateString();
}

function folderLabel(folder?: string) {
  if (!folder) return 'Unsorted';
  return folder;
}

function visibleTags(tags?: string) {
  if (!tags) return { shown: [], extra: 0 };
  const all = tags.split(',').map(t => t.trim()).filter(Boolean);
  return { shown: all.slice(0, 2), extra: Math.max(0, all.length - 2) };
}

function DocCard({ doc, onDelete, onArchiveToggle }: {
  doc: Doc;
  onDelete: (id: string, title: string) => void;
  onArchiveToggle: (doc: Doc) => void;
}) {
  const tagInfo = visibleTags(doc.tags);
  const relevantDate = doc.last_opened_at || doc.updated_at || doc.created_at;
  const relevantLabel = doc.last_opened_at ? 'Opened' : 'Updated';

  return (
    <Link
      to={`/doc/${doc.id}`}
      className="block bg-crown-surface border border-crown-border rounded-xl p-4 hover:border-crown-accent/50 transition group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-crown-text group-hover:text-crown-accent transition truncate">
              {doc.title}
            </h2>
            {doc.archived ? (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Archived
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-crown-muted mb-2">
            <span className="px-2 py-0.5 rounded-full bg-crown-bg border border-crown-border">
              {folderLabel(doc.folder)}
            </span>
            <span>{relevantLabel}: {formatDate(relevantDate)}</span>
            <span>{formatSize(doc.content_length)}</span>
          </div>

          {(tagInfo.shown.length > 0 || tagInfo.extra > 0) && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {tagInfo.shown.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-crown-bg/60 rounded-full text-[11px] text-crown-muted border border-crown-border/60">
                  {tag}
                </span>
              ))}
              {tagInfo.extra > 0 && (
                <span className="px-2 py-0.5 bg-crown-bg/60 rounded-full text-[11px] text-crown-muted border border-crown-border/60">
                  +{tagInfo.extra}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchiveToggle(doc); }}
            className="text-crown-muted hover:text-crown-accent text-sm"
            title={doc.archived ? 'Unarchive' : 'Archive'}
          >
            {doc.archived ? '📂' : '🗃️'}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(doc.id, doc.title); }}
            className="text-crown-muted hover:text-red-400 text-sm"
            title="Delete"
          >🗑️</button>
        </div>
      </div>
    </Link>
  );
}

export default function App() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [recentDocs, setRecentDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [view, setView] = useState<ViewMode>('all');
  const [sort, setSort] = useState<SortMode>('updated');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const currentSort: SortMode = view === 'recent' ? 'recent' : sort;
      const params = {
        search: search || undefined,
        tag: tagFilter || undefined,
        folder: folderFilter || undefined,
        archived: view === 'archived',
        recentOnly: view === 'recent',
        sort: currentSort,
      } as const;

      const [libraryData, recentData] = await Promise.all([
        fetchDocs(params),
        fetchDocs({ archived: false, recentOnly: true, sort: 'recent' })
      ]);

      setDocs(libraryData.docs);
      setTotal(libraryData.total);
      setRecentDocs(recentData.docs.slice(0, 6));
    } catch (err) {
      console.error('Failed to load docs:', err);
    }
    setLoading(false);
  }, [search, tagFilter, folderFilter, view, sort]);

  useEffect(() => {
    const timer = setTimeout(loadDocs, 250);
    return () => clearTimeout(timer);
  }, [loadDocs]);

  const allTags = useMemo(() => Array.from(new Set(
    docs.flatMap(d => d.tags ? d.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
  )).sort(), [docs]);

  const allFolders = useMemo(() => Array.from(new Set(
    [...docs, ...recentDocs].map(d => d.folder?.trim()).filter(Boolean) as string[]
  )).sort(), [docs, recentDocs]);

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

  const handleArchiveToggle = async (doc: Doc) => {
    if (doc.archived) {
      await unarchiveDoc(doc.id);
    } else {
      await archiveDoc(doc.id);
    }
    loadDocs();
  };

  const emptyMessage = view === 'recent'
    ? 'No recently opened documents yet.'
    : view === 'archived'
      ? 'No archived documents.'
      : search
        ? `No results for "${search}"`
        : 'No documents yet. Add some and start building your library.';

  return (
    <div className="min-h-screen bg-crown-bg">
      <header className="border-b border-crown-border bg-crown-surface sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>📚</span>
              <span>Crown<span className="text-crown-accent">Library</span></span>
            </h1>
            <p className="text-sm text-crown-muted mt-1">Your reading space for research, notes, and deep dives.</p>
          </div>
          <div className="text-crown-muted text-sm whitespace-nowrap">{total} visible documents</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {recentDocs.length > 0 && view !== 'archived' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-crown-text">Recent</h2>
              <button
                onClick={() => { setView('recent'); setSort('recent'); }}
                className="text-sm text-crown-accent hover:underline"
              >
                Open recent view →
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentDocs.map(doc => (
                <DocCard key={doc.id} doc={doc} onDelete={handleDelete} onArchiveToggle={handleArchiveToggle} />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {([
                ['all', 'All'],
                ['recent', 'Recent'],
                ['archived', 'Archived'],
              ] as Array<[ViewMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${view === mode ? 'bg-crown-accent text-white' : 'bg-crown-surface border border-crown-border text-crown-muted hover:text-crown-text'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="bg-crown-surface border border-crown-border rounded-lg px-3 py-2 text-sm text-crown-text"
                disabled={view === 'recent'}
              >
                <option value="updated">Sort: Updated</option>
                <option value="created">Sort: Created</option>
                <option value="recent">Sort: Recent</option>
              </select>

              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="bg-crown-surface border border-crown-border rounded-lg px-3 py-2 text-sm text-crown-text"
              >
                <option value="">All folders</option>
                {allFolders.map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
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
                >All tags</button>
                {allTags.slice(0, 8).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                    className={`px-3 py-1.5 rounded-full text-sm transition ${tag === tagFilter ? 'bg-crown-accent text-white' : 'bg-crown-surface border border-crown-border text-crown-muted hover:text-crown-text'}`}
                  >{tag}</button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition ${dragOver ? 'border-crown-accent bg-crown-accent/5' : 'border-crown-border'}`}
        >
          <p className="text-crown-muted mb-2">
            {uploading ? '⏳ Uploading...' : 'Drop markdown files here or'}
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
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-crown-text">
              {view === 'recent' ? 'Recent documents' : view === 'archived' ? 'Archived documents' : 'Library'}
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-crown-muted">Loading...</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 bg-crown-surface border border-crown-border rounded-xl">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-crown-muted">{emptyMessage}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {docs.map(doc => (
                <DocCard key={doc.id} doc={doc} onDelete={handleDelete} onArchiveToggle={handleArchiveToggle} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
