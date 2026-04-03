import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getReadingHistory, upsertReadingHistory } from './db.js';
import documentsRouter from './routes/documents.js';
import bookmarksRouter from './routes/bookmarks.js';
import syncRouter from './routes/sync.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3020', 10);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/documents', documentsRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/sync', syncRouter);

// Reading history routes
app.get('/api/reading/:docId', (req, res) => {
  const history = getReadingHistory(req.params.docId);
  if (!history) return res.status(404).json({ error: 'Not found' });
  res.json(history);
});

app.put('/api/reading/:docId', (req, res) => {
  try {
    const { position } = req.body;
    if (!position) return res.status(400).json({ error: 'position required' });
    const history = upsertReadingHistory(req.params.docId, position);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Serve React SPA static files
const webDistPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.sendFile(path.join(webDistPath, 'index.html'));
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'CrownLibrary API is running',
      note: 'Web UI not built. Run npm run build in packages/web',
      api: '/api/documents',
    });
  });
}

app.listen(PORT, () => {
  console.log(`👑 CrownLibrary server running at http://localhost:${PORT}`);
  if (fs.existsSync(webDistPath)) {
    console.log(`   Web UI:  http://localhost:${PORT}`);
  }
  console.log(`   API:     http://localhost:${PORT}/api/documents`);
});

export default app;
