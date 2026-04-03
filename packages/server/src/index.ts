import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import docsRouter from './routes/docs';

const app = express();
const PORT = Number(process.env.PORT) || 3011;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API routes
app.use('/api/docs', docsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', name: 'CrownLibrary' });
});

// Serve web frontend in production
const webDistPath = path.join(__dirname, '../../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📚 CrownLibrary server running on http://0.0.0.0:${PORT}`);
});

export default app;
