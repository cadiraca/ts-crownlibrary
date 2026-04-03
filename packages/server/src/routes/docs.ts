import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import db, { DB_DIR } from '../db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// List all documents
router.get('/', (req: Request, res: Response) => {
  const { tag, search, limit, offset } = req.query;

  let docs;

  if (search && typeof search === 'string') {
    // Full-text search
    const stmt = db.prepare(`
      SELECT d.id, d.title, d.tags, d.created_at, d.updated_at,
             LENGTH(d.content_md) as content_length
      FROM documents d
      JOIN documents_fts fts ON d.rowid = fts.rowid
      WHERE documents_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `);
    docs = stmt.all(search, Number(limit) || 50, Number(offset) || 0);
  } else if (tag && typeof tag === 'string') {
    // Filter by tag
    const stmt = db.prepare(`
      SELECT id, title, tags, created_at, updated_at,
             LENGTH(content_md) as content_length
      FROM documents
      WHERE ',' || tags || ',' LIKE '%,' || ? || ',%'
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    docs = stmt.all(tag, Number(limit) || 50, Number(offset) || 0);
  } else {
    // List all
    const stmt = db.prepare(`
      SELECT id, title, tags, created_at, updated_at,
             LENGTH(content_md) as content_length
      FROM documents
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    docs = stmt.all(Number(limit) || 50, Number(offset) || 0);
  }

  const count = db.prepare('SELECT COUNT(*) as total FROM documents').get() as { total: number };

  res.json({ docs, total: count.total });
});

// Get single document
router.get('/:id', (req: Request, res: Response) => {
  const doc = db.prepare(`
    SELECT d.*, 
      (SELECT json_group_array(json_object(
        'id', b.id, 'section', b.section, 'scroll_pos', b.scroll_pos, 
        'note', b.note, 'created_at', b.created_at
      )) FROM bookmarks b WHERE b.doc_id = d.id) as bookmarks
    FROM documents d 
    WHERE d.id = ?
  `).get(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Parse bookmarks JSON
  const result = doc as any;
  try {
    result.bookmarks = JSON.parse(result.bookmarks || '[]');
    // Filter out null entries
    result.bookmarks = result.bookmarks.filter((b: any) => b && b.id);
  } catch {
    result.bookmarks = [];
  }

  res.json(result);
});

// Add document (JSON body)
router.post('/', (req: Request, res: Response) => {
  const { title, content_md, tags } = req.body;

  if (!title || !content_md) {
    return res.status(400).json({ error: 'title and content_md are required' });
  }

  const id = uuidv4();
  const tagStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

  db.prepare(`
    INSERT INTO documents (id, title, content_md, tags) VALUES (?, ?, ?, ?)
  `).run(id, title, content_md, tagStr);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  res.status(201).json(doc);
});

// Upload document (file)
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const content_md = req.file.buffer.toString('utf-8');
  const title = req.body.title || req.file.originalname.replace(/\.md$/i, '');
  const tags = req.body.tags || '';
  const id = uuidv4();

  db.prepare(`
    INSERT INTO documents (id, title, content_md, tags) VALUES (?, ?, ?, ?)
  `).run(id, title, content_md, tags);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  res.status(201).json(doc);
});

// Update document
router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const { title, content_md, tags } = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (content_md !== undefined) { updates.push('content_md = ?'); values.push(content_md); }
  if (tags !== undefined) {
    const tagStr = Array.isArray(tags) ? tags.join(',') : tags;
    updates.push('tags = ?');
    values.push(tagStr);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push("updated_at = datetime('now')");
  values.push(req.params.id);

  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json(doc);
});

// Delete document
router.delete('/:id', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ deleted: true });
});

// Bookmark a document
router.post('/:id/bookmark', (req: Request, res: Response) => {
  const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const { section, scroll_pos, note } = req.body;
  const id = uuidv4();

  db.prepare(`
    INSERT INTO bookmarks (id, doc_id, section, scroll_pos, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.params.id, section || '', scroll_pos || 0, note || '');

  const bookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id);
  res.status(201).json(bookmark);
});

// Get bookmarks for a document
router.get('/:id/bookmarks', (req: Request, res: Response) => {
  const bookmarks = db.prepare(
    'SELECT * FROM bookmarks WHERE doc_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);
  res.json(bookmarks);
});

// Delete a bookmark
router.delete('/:id/bookmark/:bookmarkId', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM bookmarks WHERE id = ? AND doc_id = ?')
    .run(req.params.bookmarkId, req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }
  res.json({ deleted: true });
});

// Export document to PDF
router.get('/:id/export/pdf', async (req: Request, res: Response) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as any;
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  try {
    const { marked } = await import('marked');
    const htmlContent = await marked(doc.content_md);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px; }
    h2 { color: #16213e; margin-top: 30px; }
    h3 { color: #0f3460; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #1a1a2e; color: #e4e4e4; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: transparent; color: inherit; }
    blockquote { border-left: 4px solid #e94560; margin-left: 0; padding-left: 16px; color: #666; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f8f8f8; }
    a { color: #e94560; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <h1>${doc.title}</h1>
  ${htmlContent}
  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 0.8em;">
    Exported from CrownLibrary — ${new Date().toISOString().split('T')[0]}
  </footer>
</body>
</html>`;

    // Try puppeteer for PDF
    let pdfBuffer: Buffer;
    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      pdfBuffer = Buffer.from(await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true
      }));
      await browser.close();
    } catch {
      // Fallback: return HTML if puppeteer isn't available
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.html"`);
      return res.send(html);
    }

    // Save export record
    const exportId = (await import('uuid')).v4();
    const exportDir = path.join(DB_DIR, 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const exportPath = path.join(exportDir, `${doc.id}-${Date.now()}.pdf`);
    fs.writeFileSync(exportPath, pdfBuffer);

    db.prepare(`
      INSERT INTO exports (id, doc_id, format, path) VALUES (?, ?, 'pdf', ?)
    `).run(exportId, doc.id, exportPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'PDF export failed', details: err.message });
  }
});

// Get all bookmarks across all documents
router.get('/bookmarks/all', (_req: Request, res: Response) => {
  const bookmarks = db.prepare(`
    SELECT b.*, d.title as doc_title
    FROM bookmarks b
    JOIN documents d ON b.doc_id = d.id
    ORDER BY b.created_at DESC
  `).all();
  res.json(bookmarks);
});

export default router;
