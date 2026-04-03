#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { execSync, spawn } from 'child_process';

const DB_DIR = path.join(process.env.HOME || '~', '.crown');
const DB_PATH = path.join(DB_DIR, 'library.db');

// Ensure DB dir exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize DB (reuse same schema)
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content_md TEXT NOT NULL,
    tags TEXT DEFAULT '',
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

const program = new Command();
program
  .name('cl')
  .description('📚 CrownLibrary CLI — your personal research library')
  .version('1.0.0');

// cl add <file.md>
program
  .command('add <file>')
  .description('Add a markdown document to the library')
  .option('-t, --title <title>', 'Document title')
  .option('--tags <tags>', 'Comma-separated tags')
  .action((file: string, opts: { title?: string; tags?: string }) => {
    if (!fs.existsSync(file)) {
      console.error(chalk.red(`File not found: ${file}`));
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const title = opts.title || path.basename(file, '.md');
    const tags = opts.tags || '';
    const id = uuidv4();

    db.prepare('INSERT INTO documents (id, title, content_md, tags) VALUES (?, ?, ?, ?)')
      .run(id, title, content, tags);

    console.log(chalk.green('✅ Document added'));
    console.log(chalk.dim(`   ID: ${id}`));
    console.log(chalk.dim(`   Title: ${title}`));
    if (tags) console.log(chalk.dim(`   Tags: ${tags}`));
    console.log(chalk.dim(`   Size: ${(content.length / 1024).toFixed(1)} KB`));
  });

// cl ls
program
  .command('ls')
  .description('List documents')
  .option('--tag <tag>', 'Filter by tag')
  .option('-l, --limit <n>', 'Limit results', '50')
  .action((opts: { tag?: string; limit: string }) => {
    let docs: any[];

    if (opts.tag) {
      docs = db.prepare(`
        SELECT id, title, tags, created_at, LENGTH(content_md) as size
        FROM documents 
        WHERE ',' || tags || ',' LIKE '%,' || ? || ',%'
        ORDER BY updated_at DESC LIMIT ?
      `).all(opts.tag, Number(opts.limit));
    } else {
      docs = db.prepare(`
        SELECT id, title, tags, created_at, LENGTH(content_md) as size
        FROM documents ORDER BY updated_at DESC LIMIT ?
      `).all(Number(opts.limit));
    }

    if (docs.length === 0) {
      console.log(chalk.yellow('No documents found.'));
      return;
    }

    console.log(chalk.bold(`\n📚 Library (${docs.length} docs)\n`));
    for (const doc of docs) {
      const shortId = doc.id.substring(0, 8);
      const size = (doc.size / 1024).toFixed(1);
      const tags = doc.tags ? chalk.cyan(` [${doc.tags}]`) : '';
      console.log(
        `  ${chalk.yellow(shortId)}  ${chalk.white(doc.title)}${tags}  ${chalk.dim(`${size} KB  ${doc.created_at}`)}`
      );
    }
    console.log();
  });

// cl search
program
  .command('search <query>')
  .description('Full-text search across documents')
  .action((query: string) => {
    const docs = db.prepare(`
      SELECT d.id, d.title, d.tags, d.created_at, 
             snippet(documents_fts, 1, '>>>','<<<', '...', 30) as snippet
      FROM documents d
      JOIN documents_fts fts ON d.rowid = fts.rowid
      WHERE documents_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `).all(query);

    if (docs.length === 0) {
      console.log(chalk.yellow(`No results for "${query}"`));
      return;
    }

    console.log(chalk.bold(`\n🔍 Results for "${query}" (${docs.length})\n`));
    for (const doc of docs as any[]) {
      const shortId = doc.id.substring(0, 8);
      console.log(`  ${chalk.yellow(shortId)}  ${chalk.white(doc.title)}`);
      if (doc.snippet) {
        console.log(chalk.dim(`           ${doc.snippet.replace(/>>>/g, chalk.green('>>>')).replace(/<<</g, chalk.green('<<<'))}`));
      }
    }
    console.log();
  });

// cl read <id>
program
  .command('read <id>')
  .description('Read a document in the terminal')
  .action((id: string) => {
    // Support short IDs
    let doc: any;
    if (id.length < 36) {
      doc = db.prepare('SELECT * FROM documents WHERE id LIKE ? || \'%\'').get(id);
    } else {
      doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    }

    if (!doc) {
      console.error(chalk.red('Document not found'));
      process.exit(1);
    }

    // Write to temp file and open in less
    const tmpFile = path.join('/tmp', `cl-${doc.id.substring(0, 8)}.md`);
    const header = `# ${doc.title}\nTags: ${doc.tags || 'none'} | Added: ${doc.created_at}\n${'─'.repeat(60)}\n\n`;
    fs.writeFileSync(tmpFile, header + doc.content_md);

    try {
      execSync(`less -R "${tmpFile}"`, { stdio: 'inherit' });
    } catch {
      // User quit less, that's fine
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

// cl export <id> --pdf
program
  .command('export <id>')
  .description('Export a document')
  .option('--pdf', 'Export as PDF')
  .action(async (id: string, opts: { pdf?: boolean }) => {
    let doc: any;
    if (id.length < 36) {
      doc = db.prepare('SELECT * FROM documents WHERE id LIKE ? || \'%\'').get(id);
    } else {
      doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    }

    if (!doc) {
      console.error(chalk.red('Document not found'));
      process.exit(1);
    }

    if (opts.pdf) {
      console.log(chalk.dim('Generating PDF...'));

      try {
        const { marked } = await import('marked');
        const htmlContent = await marked(doc.content_md);

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
h1 { border-bottom: 2px solid #e94560; padding-bottom: 10px; }
code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
pre { background: #1a1a2e; color: #e4e4e4; padding: 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: transparent; color: inherit; }
blockquote { border-left: 4px solid #e94560; margin-left: 0; padding-left: 16px; color: #666; }
table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; }
</style></head><body><h1>${doc.title}</h1>${htmlContent}</body></html>`;

        const puppeteer = await import('puppeteer');
        const browser = await puppeteer.default.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const exportDir = path.join(DB_DIR, 'exports');
        if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

        const outPath = path.join(exportDir, `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        await page.pdf({
          path: outPath,
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
          printBackground: true
        });
        await browser.close();

        const exportId = uuidv4();
        db.prepare('INSERT INTO exports (id, doc_id, format, path) VALUES (?, ?, ?, ?)')
          .run(exportId, doc.id, 'pdf', outPath);

        console.log(chalk.green(`✅ PDF exported: ${outPath}`));
      } catch (err: any) {
        console.error(chalk.red(`PDF export failed: ${err.message}`));
        process.exit(1);
      }
    } else {
      // Default: export as markdown
      const outPath = `./${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      fs.writeFileSync(outPath, doc.content_md);
      console.log(chalk.green(`✅ Exported: ${outPath}`));
    }
  });

// cl bookmark <id>
program
  .command('bookmark <id>')
  .description('Bookmark a position in a document')
  .option('-s, --section <section>', 'Section name/heading')
  .option('-n, --note <note>', 'Note for the bookmark')
  .action((id: string, opts: { section?: string; note?: string }) => {
    let doc: any;
    if (id.length < 36) {
      doc = db.prepare('SELECT id FROM documents WHERE id LIKE ? || \'%\'').get(id);
    } else {
      doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(id);
    }

    if (!doc) {
      console.error(chalk.red('Document not found'));
      process.exit(1);
    }

    const bmId = uuidv4();
    db.prepare('INSERT INTO bookmarks (id, doc_id, section, note) VALUES (?, ?, ?, ?)')
      .run(bmId, doc.id, opts.section || '', opts.note || '');

    console.log(chalk.green('📌 Bookmark saved'));
    if (opts.section) console.log(chalk.dim(`   Section: ${opts.section}`));
    if (opts.note) console.log(chalk.dim(`   Note: ${opts.note}`));
  });

// cl bookmarks
program
  .command('bookmarks')
  .description('List all bookmarks')
  .action(() => {
    const bookmarks = db.prepare(`
      SELECT b.*, d.title as doc_title
      FROM bookmarks b
      JOIN documents d ON b.doc_id = d.id
      ORDER BY b.created_at DESC
    `).all() as any[];

    if (bookmarks.length === 0) {
      console.log(chalk.yellow('No bookmarks yet.'));
      return;
    }

    console.log(chalk.bold(`\n📌 Bookmarks (${bookmarks.length})\n`));
    for (const bm of bookmarks) {
      const shortDocId = bm.doc_id.substring(0, 8);
      console.log(`  ${chalk.yellow(shortDocId)}  ${chalk.white(bm.doc_title)}`);
      if (bm.section) console.log(chalk.dim(`           Section: ${bm.section}`));
      if (bm.note) console.log(chalk.dim(`           Note: ${bm.note}`));
      console.log(chalk.dim(`           ${bm.created_at}`));
    }
    console.log();
  });

// cl serve
program
  .command('serve')
  .description('Start the CrownLibrary web server')
  .option('-p, --port <port>', 'Port number', '3011')
  .action((opts: { port: string }) => {
    const serverPath = path.join(__dirname, '../../server/dist/index.js');
    if (!fs.existsSync(serverPath)) {
      console.error(chalk.red('Server not built. Run: npm run build --workspace=packages/server'));
      process.exit(1);
    }

    console.log(chalk.cyan(`📚 Starting CrownLibrary on port ${opts.port}...`));
    const child = spawn('node', [serverPath], {
      env: { ...process.env, PORT: opts.port },
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code !== 0) console.error(chalk.red(`Server exited with code ${code}`));
    });
  });

program.parse();
