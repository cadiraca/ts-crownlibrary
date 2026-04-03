import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

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

export interface ReadingHistory {
  id: string;
  document_id: string;
  last_position: string;
  last_read_at: string;
}

function getDbPath(): string {
  if (process.env.CL_DB_PATH) {
    return process.env.CL_DB_PATH;
  }
  const crownDir = path.join(os.homedir(), '.crown');
  if (!fs.existsSync(crownDir)) {
    fs.mkdirSync(crownDir, { recursive: true });
  }
  return path.join(crownDir, 'library.db');
}

export function getFilesDir(): string {
  const dir = path.join(os.homedir(), '.crown', 'library', 'files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = getDbPath();
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      word_count INTEGER NOT NULL DEFAULT 0,
      reading_time_min INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      position TEXT NOT NULL DEFAULT '{}',
      label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
      last_position TEXT NOT NULL DEFAULT '{}',
      last_read_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      title, content, tags,
      content=documents,
      content_rowid=rowid
    );

    CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, title, content, tags)
      VALUES (new.rowid, new.title, new.content, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content, tags)
      VALUES ('delete', old.rowid, old.title, old.content, old.tags);
      INSERT INTO documents_fts(rowid, title, content, tags)
      VALUES (new.rowid, new.title, new.content, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, title, content, tags)
      VALUES ('delete', old.rowid, old.title, old.content, old.tags);
    END;
  `);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function computeStats(content: string): { word_count: number; reading_time_min: number } {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const reading_time_min = Math.ceil(words / 200);
  return { word_count: words, reading_time_min };
}

// Documents
export function addDocument(title: string, content: string, tags: string[]): Document {
  const db = getDb();
  const id = generateId();
  const tagsStr = tags.join(',');
  const { word_count, reading_time_min } = computeStats(content);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO documents (id, title, content, tags, created_at, updated_at, word_count, reading_time_min)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, content, tagsStr, now, now, word_count, reading_time_min);

  return getDocument(id)!;
}

export function getDocument(id: string): Document | null {
  const db = getDb();
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Document | null;
}

export function listDocuments(tag?: string, search?: string, sort: string = 'created_at'): Document[] {
  const db = getDb();

  if (search) {
    const rows = db.prepare(`
      SELECT d.* FROM documents d
      JOIN documents_fts fts ON d.rowid = fts.rowid
      WHERE documents_fts MATCH ?
      ORDER BY d.${sort === 'title' ? 'title' : 'created_at'} DESC
    `).all(search) as Document[];
    if (tag) return rows.filter(d => d.tags.split(',').includes(tag));
    return rows;
  }

  if (tag) {
    return db.prepare(`
      SELECT * FROM documents WHERE ',' || tags || ',' LIKE ?
      ORDER BY ${sort === 'title' ? 'title' : 'created_at'} DESC
    `).all(`%,${tag},%`) as Document[];
  }

  return db.prepare(`
    SELECT * FROM documents ORDER BY ${sort === 'title' ? 'title' : 'created_at'} DESC
  `).all() as Document[];
}

export function updateDocument(id: string, updates: Partial<Pick<Document, 'title' | 'content' | 'tags'>>): Document | null {
  const db = getDb();
  const doc = getDocument(id);
  if (!doc) return null;

  const content = updates.content ?? doc.content;
  const { word_count, reading_time_min } = computeStats(content);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE documents SET
      title = ?, content = ?, tags = ?, updated_at = ?, word_count = ?, reading_time_min = ?
    WHERE id = ?
  `).run(
    updates.title ?? doc.title,
    content,
    updates.tags ?? doc.tags,
    now, word_count, reading_time_min, id
  );

  return getDocument(id);
}

export function deleteDocument(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return result.changes > 0;
}

// Bookmarks
export function addBookmark(documentId: string, position: object, label?: string): Bookmark {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO bookmarks (id, document_id, position, label, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, documentId, JSON.stringify(position), label ?? null, now);
  return db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as Bookmark;
}

export function getBookmarks(documentId: string): Bookmark[] {
  const db = getDb();
  return db.prepare('SELECT * FROM bookmarks WHERE document_id = ? ORDER BY created_at DESC').all(documentId) as Bookmark[];
}

export function deleteBookmark(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  return result.changes > 0;
}

// Reading history
export function getReadingHistory(documentId: string): ReadingHistory | null {
  const db = getDb();
  return db.prepare('SELECT * FROM reading_history WHERE document_id = ?').get(documentId) as ReadingHistory | null;
}

export function upsertReadingHistory(documentId: string, position: object): ReadingHistory {
  const db = getDb();
  const existing = getReadingHistory(documentId);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE reading_history SET last_position = ?, last_read_at = ? WHERE document_id = ?
    `).run(JSON.stringify(position), now, documentId);
  } else {
    const id = generateId();
    db.prepare(`
      INSERT INTO reading_history (id, document_id, last_position, last_read_at)
      VALUES (?, ?, ?, ?)
    `).run(id, documentId, JSON.stringify(position), now);
  }

  return getReadingHistory(documentId)!;
}

export function getAllDocumentsManifest(): Array<{ id: string; title: string; updated_at: string; word_count: number }> {
  const db = getDb();
  return db.prepare('SELECT id, title, updated_at, word_count FROM documents ORDER BY updated_at DESC').all() as Array<{ id: string; title: string; updated_at: string; word_count: number }>;
}
