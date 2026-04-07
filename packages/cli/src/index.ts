#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const DEFAULT_API = 'http://192.168.1.56:3111';
const API_BASE = process.env.CROWNLIBRARY_API || DEFAULT_API;

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function api(method: string, path: string, body?: any): Promise<any> {
  const url = `${API_BASE}/api${path}`;
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`;
      throw new Error(msg);
    }
    return data;
  } catch (err: any) {
    if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      console.error(chalk.red(`✗ Cannot connect to CrownLibrary at ${API_BASE}`));
      console.error(chalk.dim('  Set CROWNLIBRARY_API env var to your server URL'));
      process.exit(1);
    }
    throw err;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function shortId(id: string): string {
  return id.substring(0, 8);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const program = new Command();
program
  .name('cl')
  .description('📚 CrownLibrary CLI — your personal research library')
  .version('1.0.0');

// ─── STATUS ──────────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Check CrownLibrary server health')
  .action(async () => {
    try {
      const data = await api('GET', '/health');
      console.log(chalk.green('✓ CrownLibrary server is running'));
      console.log(chalk.dim(`  URL:     ${API_BASE}`));
      console.log(chalk.dim(`  Version: ${data.version}`));
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── LIST ────────────────────────────────────────────────────────────────────
program
  .command('list')
  .aliases(['ls'])
  .description('List all documents')
  .option('--tag <tag>', 'Filter by tag')
  .option('-l, --limit <n>', 'Limit results', '50')
  .option('--offset <n>', 'Offset for pagination', '0')
  .action(async (opts: { tag?: string; limit: string; offset: string }) => {
    try {
      const params = new URLSearchParams();
      if (opts.tag) params.set('tag', opts.tag);
      params.set('limit', opts.limit);
      params.set('offset', opts.offset);

      const data = await api('GET', `/docs?${params}`);
      const docs = data.docs;

      if (docs.length === 0) {
        console.log(chalk.yellow('No documents found.'));
        return;
      }

      console.log(chalk.bold(`\n📚 CrownLibrary (${docs.length} of ${data.total} docs)\n`));
      for (const doc of docs) {
        const tags = doc.tags ? chalk.cyan(` [${doc.tags}]`) : '';
        const size = formatSize(doc.content_length || 0);
        const date = formatDate(doc.created_at);
        console.log(
          `  ${chalk.yellow(shortId(doc.id))}  ${chalk.white(doc.title)}${tags}  ${chalk.dim(`${size}  ${date}`)}`
        );
      }
      console.log();
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── SEARCH ──────────────────────────────────────────────────────────────────
program
  .command('search <query>')
  .description('Full-text search across documents')
  .action(async (query: string) => {
    try {
      const params = new URLSearchParams({ search: query });
      const data = await api('GET', `/docs?${params}`);
      const docs = data.docs;

      if (docs.length === 0) {
        console.log(chalk.yellow(`No results for "${query}"`));
        return;
      }

      console.log(chalk.bold(`\n🔍 Results for "${query}" (${docs.length})\n`));
      for (const doc of docs) {
        const tags = doc.tags ? chalk.cyan(` [${doc.tags}]`) : '';
        console.log(`  ${chalk.yellow(shortId(doc.id))}  ${chalk.white(doc.title)}${tags}`);
      }
      console.log();
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── ADD ─────────────────────────────────────────────────────────────────────
program
  .command('add <title>')
  .description('Add a document to the library')
  .option('--file <path>', 'Read content from file')
  .option('--stdin', 'Read content from stdin')
  .option('--tags <tags>', 'Comma-separated tags', '')
  .action(async (title: string, opts: { file?: string; stdin?: boolean; tags: string }) => {
    try {
      let content = '';

      if (opts.file) {
        const filePath = path.resolve(opts.file);
        if (!fs.existsSync(filePath)) {
          console.error(chalk.red(`File not found: ${filePath}`));
          process.exit(1);
        }
        content = fs.readFileSync(filePath, 'utf-8');
      } else if (opts.stdin) {
        content = await readStdin();
      } else {
        console.error(chalk.red('Provide --file <path> or --stdin'));
        process.exit(1);
      }

      const tags = opts.tags || '';
      const doc = await api('POST', '/docs', { title, content_md: content, tags });

      console.log(chalk.green('✓ Document added'));
      console.log(chalk.bold(`  ID:    `) + doc.id);
      console.log(chalk.bold(`  Title: `) + doc.title);
      console.log(chalk.bold(`  Tags:  `) + (doc.tags || chalk.dim('(none)')));
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── READ ────────────────────────────────────────────────────────────────────
program
  .command('read <id>')
  .description('Read a document (renders markdown in terminal)')
  .option('--raw', 'Output raw markdown without rendering')
  .action(async (id: string, opts: { raw?: boolean }) => {
    try {
      const doc = await api('GET', `/docs/${id}`);

      if (opts.raw) {
        process.stdout.write(doc.content_md);
        return;
      }

      // Terminal markdown rendering
      try {
        const { marked } = await import('marked');
        const TerminalRenderer = (await import('marked-terminal')).default;
        marked.setOptions({
          renderer: new (TerminalRenderer as any)({
            reflowText: true,
            width: Math.min(process.stdout.columns || 80, 120),
          }),
        });

        const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];
        console.log(chalk.bold.blue(`\n# ${doc.title}`));
        if (tags.length > 0) console.log(chalk.cyan(`Tags: ${tags.join(', ')}`));
        console.log(chalk.dim(`Created: ${formatDate(doc.created_at)} · Updated: ${formatDate(doc.updated_at)}`));
        console.log(chalk.dim('─'.repeat(60)));
        console.log('');
        const rendered = await marked(doc.content_md);
        console.log(rendered);
      } catch {
        // Fallback to raw if marked-terminal fails
        console.log(chalk.bold.blue(`\n# ${doc.title}\n`));
        console.log(doc.content_md);
      }
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── DELETE ──────────────────────────────────────────────────────────────────
program
  .command('delete <id>')
  .description('Delete a document')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (id: string, opts: { yes?: boolean }) => {
    try {
      // Fetch first to show what we're deleting
      const doc = await api('GET', `/docs/${id}`);

      if (!opts.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) =>
          rl.question(chalk.yellow(`Delete "${doc.title}"? (y/N) `), resolve)
        );
        rl.close();
        if (answer.toLowerCase() !== 'y') {
          console.log(chalk.dim('Cancelled.'));
          return;
        }
      }

      await api('DELETE', `/docs/${id}`);
      console.log(chalk.green(`✓ Deleted: ${doc.title}`));
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── BOOKMARK ────────────────────────────────────────────────────────────────
program
  .command('bookmark <id>')
  .description('Add a bookmark to a document')
  .option('-s, --section <section>', 'Section name/heading')
  .option('-n, --note <note>', 'Note for the bookmark')
  .action(async (id: string, opts: { section?: string; note?: string }) => {
    try {
      const bm = await api('POST', `/docs/${id}/bookmark`, {
        section: opts.section || '',
        note: opts.note || '',
      });

      console.log(chalk.green('📌 Bookmark saved'));
      console.log(chalk.dim(`  ID: ${bm.id}`));
      if (opts.section) console.log(chalk.dim(`  Section: ${opts.section}`));
      if (opts.note) console.log(chalk.dim(`  Note: ${opts.note}`));
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── BOOKMARKS ───────────────────────────────────────────────────────────────
program
  .command('bookmarks [id]')
  .description('List bookmarks (for a doc, or all)')
  .action(async (id?: string) => {
    try {
      let bookmarks: any[];

      if (id) {
        bookmarks = await api('GET', `/docs/${id}/bookmarks`);
        const doc = await api('GET', `/docs/${id}`);
        console.log(chalk.bold(`\n📌 Bookmarks for "${doc.title}" (${bookmarks.length})\n`));
      } else {
        bookmarks = await api('GET', '/docs/bookmarks/all');
        console.log(chalk.bold(`\n📌 All Bookmarks (${bookmarks.length})\n`));
      }

      if (bookmarks.length === 0) {
        console.log(chalk.yellow('  No bookmarks found.'));
        return;
      }

      for (const bm of bookmarks) {
        const docTitle = bm.doc_title || '';
        const prefix = docTitle ? `${chalk.white(docTitle)} · ` : '';
        console.log(`  ${chalk.yellow(shortId(bm.id))}  ${prefix}${chalk.dim(bm.created_at)}`);
        if (bm.section) console.log(chalk.dim(`           Section: ${bm.section}`));
        if (bm.note) console.log(chalk.dim(`           Note: ${bm.note}`));
      }
      console.log();
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── TAGS ────────────────────────────────────────────────────────────────────
program
  .command('tags')
  .description('List all unique tags')
  .action(async () => {
    try {
      const data = await api('GET', '/docs?limit=9999');
      const tagSet = new Set<string>();

      for (const doc of data.docs) {
        if (doc.tags) {
          for (const t of doc.tags.split(',')) {
            const trimmed = t.trim();
            if (trimmed) tagSet.add(trimmed);
          }
        }
      }

      const tags = [...tagSet].sort();
      if (tags.length === 0) {
        console.log(chalk.yellow('No tags found.'));
        return;
      }

      console.log(chalk.bold(`\n🏷️  Tags (${tags.length})\n`));
      for (const tag of tags) {
        console.log(`  ${chalk.cyan(tag)}`);
      }
      console.log();
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

// ─── EXPORT ──────────────────────────────────────────────────────────────────
program
  .command('export <id>')
  .description('Export a document')
  .option('--pdf', 'Export as PDF (downloads from server)')
  .option('--md', 'Export as Markdown file')
  .option('-o, --out <path>', 'Output path')
  .action(async (id: string, opts: { pdf?: boolean; md?: boolean; out?: string }) => {
    try {
      const doc = await api('GET', `/docs/${id}`);
      const safeName = doc.title
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();

      if (opts.md || !opts.pdf) {
        // Export as markdown
        const outPath = opts.out || `./${safeName}.md`;
        fs.writeFileSync(outPath, doc.content_md, 'utf-8');
        console.log(chalk.green(`✓ Exported markdown: ${outPath}`));
      } else if (opts.pdf) {
        // Download PDF from server
        const url = `${API_BASE}/api/docs/${id}/export/pdf`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`PDF export failed: HTTP ${res.status}`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const outPath = opts.out || `./${safeName}.pdf`;
        fs.writeFileSync(outPath, buffer);
        console.log(chalk.green(`✓ Exported PDF: ${outPath}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      process.exit(1);
    }
  });

program.parse();
