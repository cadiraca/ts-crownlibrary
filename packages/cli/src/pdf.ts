import { Document } from './db.js';
import path from 'path';
import fs from 'fs';

export async function exportToPdf(doc: Document, outputPath: string): Promise<void> {
  // Try puppeteer-core first, fall back to HTML file
  try {
    await exportWithPuppeteer(doc, outputPath);
  } catch (err) {
    console.error('Puppeteer not available, generating HTML instead...');
    const htmlPath = outputPath.replace(/\.pdf$/i, '.html');
    await exportToHtml(doc, htmlPath);
    throw new Error(`PDF generation requires Chromium. HTML exported to: ${htmlPath}`);
  }
}

async function exportWithPuppeteer(doc: Document, outputPath: string): Promise<void> {
  // Dynamic import to avoid crash if not installed
  const puppeteer = await import('puppeteer-core');

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    findChromium();

  if (!executablePath) {
    throw new Error('Chromium not found');
  }

  const html = buildHtml(doc);
  const browser = await puppeteer.default.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

function findChromium(): string | null {
  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function exportToHtml(doc: Document, outputPath: string): Promise<void> {
  const html = buildHtml(doc);
  fs.writeFileSync(outputPath, html, 'utf-8');
}

function buildHtml(doc: Document): string {
  const { marked } = require('marked');
  const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];
  const createdAt = new Date(doc.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const contentHtml = marked.parse(doc.content);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(doc.title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #1a1a1a;
    background: white;
  }
  .cover {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 100vh;
    padding: 40mm 20mm;
    text-align: center;
  }
  .cover h1 {
    font-size: 28pt;
    font-weight: bold;
    margin-bottom: 20px;
    color: #1a1a1a;
  }
  .cover .meta {
    color: #666;
    font-size: 11pt;
    margin-top: 10px;
  }
  .cover .tags {
    margin-top: 20px;
  }
  .cover .tag {
    display: inline-block;
    background: #f0f0f0;
    border-radius: 4px;
    padding: 4px 10px;
    margin: 3px;
    font-size: 10pt;
    color: #555;
  }
  .content {
    padding: 10mm 0;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Arial', sans-serif;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    color: #1a1a1a;
  }
  h1 { font-size: 20pt; border-bottom: 2px solid #eee; padding-bottom: 8px; }
  h2 { font-size: 16pt; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  h3 { font-size: 13pt; }
  p { margin-bottom: 1em; }
  code {
    font-family: 'Courier New', monospace;
    background: #f4f4f4;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 9pt;
  }
  pre {
    background: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 12px;
    overflow-x: auto;
    margin: 1em 0;
    page-break-inside: avoid;
  }
  pre code {
    background: none;
    padding: 0;
    font-size: 9pt;
  }
  blockquote {
    border-left: 4px solid #ccc;
    padding-left: 16px;
    color: #666;
    margin: 1em 0;
    font-style: italic;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  th { background: #f4f4f4; font-weight: bold; }
  ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
  li { margin-bottom: 0.3em; }
  a { color: #2563eb; text-decoration: underline; }
  img { max-width: 100%; height: auto; }
  hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
</style>
</head>
<body>
<div class="cover">
  <h1>${escapeHtml(doc.title)}</h1>
  <div class="meta">
    <div>${doc.reading_time_min} min read · ${doc.word_count.toLocaleString()} words</div>
    <div>${createdAt}</div>
  </div>
  ${tags.length > 0 ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
</div>
<div class="content">
${contentHtml}
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
