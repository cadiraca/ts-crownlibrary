import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  addDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  getFilesDir,
} from '../db.js';
import { exportToPdf } from '@crown/cli/dist/pdf.js';

const router = Router();

// GET /api/documents
router.get('/', (req: Request, res: Response) => {
  try {
    const { tag, search, sort } = req.query as Record<string, string>;
    const docs = listDocuments(tag, search, sort);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/documents/:id
router.get('/:id', (req: Request, res: Response) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// POST /api/documents
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, content, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });
    const tagsArr: string[] = Array.isArray(tags)
      ? tags
      : (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
    const doc = addDocument(title, content, tagsArr);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/documents/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { title, content, tags } = req.body;
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    const doc = updateDocument(req.params.id, { title, content, tags: tagsStr });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = deleteDocument(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// GET /api/documents/:id/md
router.get('/:id/md', (req: Request, res: Response) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const safeName = doc.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.md"`);
  res.send(doc.content);
});

// GET /api/documents/:id/pdf
router.get('/:id/pdf', async (req: Request, res: Response) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const filesDir = getFilesDir();
  const safeName = doc.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
  const outPath = path.join(filesDir, `${safeName}-${doc.id}.pdf`);

  try {
    await exportToPdf(doc, outPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    const stream = fs.createReadStream(outPath);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
