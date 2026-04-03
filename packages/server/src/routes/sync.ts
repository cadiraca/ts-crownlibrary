import { Router, Request, Response } from 'express';
import {
  getAllDocumentsManifest,
  getDocument,
  addBookmark,
  getBookmarks,
} from '../db.js';

const router = Router();

// GET /api/sync/manifest — list docs with timestamps (for mobile sync)
router.get('/manifest', (req: Request, res: Response) => {
  const manifest = getAllDocumentsManifest();
  res.json(manifest);
});

// GET /api/sync/document/:id — get full doc for offline cache
router.get('/document/:id', (req: Request, res: Response) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// POST /api/sync/bookmarks — sync bookmarks from mobile
router.post('/bookmarks', (req: Request, res: Response) => {
  try {
    const { bookmarks } = req.body as {
      bookmarks: Array<{ document_id: string; position: object; label?: string }>;
    };
    if (!Array.isArray(bookmarks)) return res.status(400).json({ error: 'bookmarks array required' });

    const created = [];
    for (const b of bookmarks) {
      if (!b.document_id || !b.position) continue;
      const doc = getDocument(b.document_id);
      if (!doc) continue;
      const bm = addBookmark(b.document_id, b.position, b.label);
      created.push(bm);
    }

    res.json({ synced: created.length, bookmarks: created });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
