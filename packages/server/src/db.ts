import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.env.HOME || '~', '.crown', 'library.db');
const DB_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content_md TEXT NOT NULL,
    tags TEXT DEFAULT '',
    folder TEXT DEFAULT '',
    archived INTEGER DEFAULT 0,
    last_opened_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    section TEXT DEFAULT '',
    scroll_pos REAL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exports (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    format TEXT NOT NULL,
    path TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title, content_md, tags, content='documents', content_rowid='rowid'
  );

  -- Triggers for FTS sync
  CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts(rowid, title, content_md, tags)
    VALUES (new.rowid, new.title, new.content_md, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, title, content_md, tags)
    VALUES ('delete', old.rowid, old.title, old.content_md, old.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, title, content_md, tags)
    VALUES ('delete', old.rowid, old.title, old.content_md, old.tags);
    INSERT INTO documents_fts(rowid, title, content_md, tags)
    VALUES (new.rowid, new.title, new.content_md, new.tags);
  END;
`);

// Lightweight forward-only migrations for older databases
const documentColumns = db.prepare(`PRAGMA table_info(documents)`).all() as Array<{ name: string }>;
const documentColumnNames = new Set(documentColumns.map((c) => c.name));

if (!documentColumnNames.has('folder')) {
  db.exec(`ALTER TABLE documents ADD COLUMN folder TEXT DEFAULT ''`);
}
if (!documentColumnNames.has('archived')) {
  db.exec(`ALTER TABLE documents ADD COLUMN archived INTEGER DEFAULT 0`);
}
if (!documentColumnNames.has('last_opened_at')) {
  db.exec(`ALTER TABLE documents ADD COLUMN last_opened_at TEXT DEFAULT NULL`);
}

export default db;
export { DB_DIR, DB_PATH };
