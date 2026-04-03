import { Document, Bookmark, ReadingHistory } from './types';

const BASE = '/api';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Documents
export const api = {
  documents: {
    list: (params?: { tag?: string; search?: string; sort?: string }) => {
      const qs = new URLSearchParams();
      if (params?.tag) qs.set('tag', params.tag);
      if (params?.search) qs.set('search', params.search);
      if (params?.sort) qs.set('sort', params.sort);
      const q = qs.toString();
      return req<Document[]>(`/documents${q ? '?' + q : ''}`);
    },
    get: (id: string) => req<Document>(`/documents/${id}`),
    create: (data: { title: string; content: string; tags?: string[] }) =>
      req<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ title: string; content: string; tags: string[] }>) =>
      req<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
    pdfUrl: (id: string) => `${BASE}/documents/${id}/pdf`,
    mdUrl: (id: string) => `${BASE}/documents/${id}/md`,
  },

  bookmarks: {
    list: (docId: string) => req<Bookmark[]>(`/bookmarks?doc=${docId}`),
    create: (data: { document_id: string; position: object; label?: string }) =>
      req<Bookmark>('/bookmarks', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<{ success: boolean }>(`/bookmarks/${id}`, { method: 'DELETE' }),
  },

  reading: {
    get: (docId: string) => req<ReadingHistory>(`/reading/${docId}`),
    update: (docId: string, position: object) =>
      req<ReadingHistory>(`/reading/${docId}`, { method: 'PUT', body: JSON.stringify({ position }) }),
  },
};
