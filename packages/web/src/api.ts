const BASE = '/api';

export interface Doc {
  id: string;
  title: string;
  content_md: string;
  tags: string;
  created_at: string;
  updated_at: string;
  content_length?: number;
  bookmarks?: Bookmark[];
}

export interface Bookmark {
  id: string;
  doc_id: string;
  section: string;
  scroll_pos: number;
  note: string;
  created_at: string;
}

export async function fetchDocs(params?: { tag?: string; search?: string }): Promise<{ docs: Doc[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set('tag', params.tag);
  if (params?.search) qs.set('search', params.search);
  const res = await fetch(`${BASE}/docs?${qs}`);
  return res.json();
}

export async function fetchDoc(id: string): Promise<Doc> {
  const res = await fetch(`${BASE}/docs/${id}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

export async function addDoc(data: { title: string; content_md: string; tags?: string }): Promise<Doc> {
  const res = await fetch(`${BASE}/docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function uploadDoc(file: File, title?: string, tags?: string): Promise<Doc> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (tags) formData.append('tags', tags);
  const res = await fetch(`${BASE}/docs/upload`, { method: 'POST', body: formData });
  return res.json();
}

export async function deleteDoc(id: string): Promise<void> {
  await fetch(`${BASE}/docs/${id}`, { method: 'DELETE' });
}

export async function addBookmark(docId: string, data: { section?: string; scroll_pos?: number; note?: string }): Promise<Bookmark> {
  const res = await fetch(`${BASE}/docs/${docId}/bookmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteBookmark(docId: string, bookmarkId: string): Promise<void> {
  await fetch(`${BASE}/docs/${docId}/bookmark/${bookmarkId}`, { method: 'DELETE' });
}

export async function getAllBookmarks(): Promise<(Bookmark & { doc_title: string })[]> {
  const res = await fetch(`${BASE}/docs/bookmarks/all`);
  return res.json();
}
