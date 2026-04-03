import { Router, Request, Response } from 'express';
import { addBookmark, getBookmarks, deleteBookmark, getDocument } from '../db.js';

const router = Router();

// GET /api/bookmarks?doc=:id
router.get('/', (req: Request, res: Response) => {
  const { doc } = req.query as Record<string, string>;
  if (!doc) return res.status(400).json({ error: 'doc query param required' });
  const bookmarks = getBookmarks(doc);
  res.json(bookmarks);
});

// POST /api/bookmarks
router.post('/', (req: Request, res: Response) => {
  try {
    const { document_id, position, label } = req.body;
    if (!document_id || !position) return res.status(400).json({ error: 'document_id and position required' });
    const exists = getDocument(document_id);
    if (!exists) return res.status(404).json({ error: 'Document not found' });
    const bookmark = addBookmark(document_id, position, label);
    res.status(201).json(bookmark);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/bookmarks/:id
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = deleteBookmark(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

export default router;
