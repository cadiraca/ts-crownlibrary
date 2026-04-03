import Constants from 'expo-constants';

const SERVER_URL = Constants.expoConfig?.extra?.serverUrl || 'http://192.168.1.56:3020';

export interface Document {
  id: string;
  title: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  reading_time_min: number;
}

export interface Bookmark {
  id: string;
  document_id: string;
  position: string;
  label: string | null;
  created_at: string;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  sync: {
    manifest: () => req<Array<{ id: string; title: string; updated_at: string; word_count: number }>>('/api/sync/manifest'),
    document: (id: string) => req<Document>(`/api/sync/document/${id}`),
  },
  documents: {
    list: (params?: { tag?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.tag) qs.set('tag', params.tag);
      if (params?.search) qs.set('search', params.search);
      const q = qs.toString();
      return req<Document[]>(`/api/documents${q ? '?' + q : ''}`);
    },
    get: (id: string) => req<Document>(`/api/documents/${id}`),
  },
  bookmarks: {
    list: (docId: string) => req<Bookmark[]>(`/api/bookmarks?doc=${docId}`),
    create: (data: { document_id: string; position: object; label?: string }) =>
      req<Bookmark>('/api/bookmarks', { method: 'POST', body: JSON.stringify(data) }),
    syncToServer: (bookmarks: Array<{ document_id: string; position: object; label?: string }>) =>
      req('/api/sync/bookmarks', { method: 'POST', body: JSON.stringify({ bookmarks }) }),
  },
  reading: {
    update: (docId: string, position: object) =>
      req(`/api/reading/${docId}`, { method: 'PUT', body: JSON.stringify({ position }) }),
  },
};
