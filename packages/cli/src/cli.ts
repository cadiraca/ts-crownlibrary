#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  addDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  getFilesDir,
} from './db.js';
import { exportToPdf } from './pdf.js';

const program = new Command();

program
  .name('cl')
  .description('CrownLibrary — personal research library CLI')
  .version('1.0.0');

// ─── ADD ─────────────────────────────────────────────────────────────────────
program
  .command('add <title>')
  .description('Add a document to the library')
  .option('--file <path>', 'Read content from file')
  .option('--stdin', 'Read content from stdin')
  .option('--tags <tags>', 'Comma-separated tags', '')
  .action(async (title: string, opts: { file?: string; stdin?: boolean; tags: string }) => {
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

    const tags = opts.tags ? opts.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const doc = addDocument(title, content, tags);

    console.log(chalk.green('✓ Document added'));
    console.log(chalk.bold(`  ID:    `) + doc.id);
    console.log(chalk.bold(`  Title: `) + doc.title);
    console.log(chalk.bold(`  Tags:  `) + (doc.tags || chalk.dim('(none)')));
    console.log(chalk.bold(`  Words: `) + doc.word_count.toLocaleString());
    console.log(chalk.bold(`  Time:  `) + `${doc.reading_time_min} min`);
  });

// ─── LS ──────────────────────────────────────────────────────────────────────
program
  .command('ls')
  .description('List documents')
  .option('--tag <tag>', 'Filter by tag')
  .option('--sort <field>', 'Sort by: created_at (default) | title', 'created_at')
  .action((opts: { tag?: string; sort: string }) => {
    const docs = listDocuments(opts.tag, undefined, opts.sort);

    if (docs.length === 0) {
      console.log(chalk.dim('No documents found.'));
      return;
    }

    console.log(chalk.bold(`\n📚 CrownLibrary (${docs.length} doc${docs.length !== 1 ? 's' : ''})\n`));

    for (const doc of docs) {
      const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];
      const tagStr = tags.length > 0 ? chalk.cyan(` [${tags.join(', ')}]`) : '';
      const date = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      console.log(`  ${chalk.yellow(doc.id)}  ${chalk.bold(doc.title)}${tagStr}`);
      console.log(`           ${chalk.dim(`${doc.word_count} words · ${doc.reading_time_min} min · ${date}`)}`);
    }
    console.log('');
  });

// ─── SEARCH ──────────────────────────────────────────────────────────────────
program
  .command('search <query>')
  .description('Full-text search documents')
  .option('--tag <tag>', 'Filter by tag')
  .action((query: string, opts: { tag?: string }) => {
    const docs = listDocuments(opts.tag, query);

    if (docs.length === 0) {
      console.log(chalk.dim(`No results for "${query}".`));
      return;
    }

    console.log(chalk.bold(`\n🔍 Search: "${query}" (${docs.length} result${docs.length !== 1 ? 's' : ''})\n`));

    for (const doc of docs) {
      const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];
      const tagStr = tags.length > 0 ? chalk.cyan(` [${tags.join(', ')}]`) : '';
      console.log(`  ${chalk.yellow(doc.id)}  ${chalk.bold(doc.title)}${tagStr}`);
    }
    console.log('');
  });

// ─── READ ─────────────────────────────────────────────────────────────────────
program
  .command('read <id>')
  .description('Output document markdown to terminal')
  .action((id: string) => {
    const doc = getDocument(id);
    if (!doc) {
      console.error(chalk.red(`Document not found: ${id}`));
      process.exit(1);
    }

    const tags = doc.tags ? doc.tags.split(',').filter(Boolean) : [];
    console.log(chalk.bold.blue(`\n# ${doc.title}`));
    if (tags.length > 0) console.log(chalk.cyan(`Tags: ${tags.join(', ')}`));
    console.log(chalk.dim(`${doc.word_count} words · ${doc.reading_time_min} min read · Created: ${new Date(doc.created_at).toLocaleDateString()}`));
    console.log(chalk.dim('─'.repeat(60)));
    console.log('');
    console.log(doc.content);
    console.log('');
  });

// ─── EXPORT ──────────────────────────────────────────────────────────────────
program
  .command('export <id>')
  .description('Export a document')
  .option('--pdf', 'Export as PDF')
  .option('--md', 'Export as Markdown file')
  .option('--out <path>', 'Output path (default: ~/.crown/library/files/)')
  .action(async (id: string, opts: { pdf?: boolean; md?: boolean; out?: string }) => {
    const doc = getDocument(id);
    if (!doc) {
      console.error(chalk.red(`Document not found: ${id}`));
      process.exit(1);
    }

    const filesDir = getFilesDir();
    const safeName = doc.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();

    if (opts.md) {
      const outPath = opts.out ?? path.join(filesDir, `${safeName}.md`);
      fs.writeFileSync(outPath, doc.content, 'utf-8');
      console.log(chalk.green(`✓ Exported markdown: ${outPath}`));
    } else if (opts.pdf) {
      const outPath = opts.out ?? path.join(filesDir, `${safeName}.pdf`);
      console.log(chalk.dim('Generating PDF...'));
      try {
        await exportToPdf(doc, outPath);
        console.log(chalk.green(`✓ Exported PDF: ${outPath}`));
      } catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
      }
    } else {
      console.error(chalk.red('Specify --pdf or --md'));
      process.exit(1);
    }
  });

// ─── DELETE ──────────────────────────────────────────────────────────────────
program
  .command('delete <id>')
  .description('Delete a document')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (id: string, opts: { yes?: boolean }) => {
    const doc = getDocument(id);
    if (!doc) {
      console.error(chalk.red(`Document not found: ${id}`));
      process.exit(1);
    }

    if (!opts.yes) {
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>(resolve => rl.question(chalk.yellow(`Delete "${doc.title}"? (y/N) `), resolve));
      rl.close();
      if (answer.toLowerCase() !== 'y') {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
    }

    deleteDocument(id);
    console.log(chalk.green(`✓ Deleted: ${doc.title}`));
  });

// ─── SERVE ───────────────────────────────────────────────────────────────────
program
  .command('serve')
  .description('Start the web server')
  .option('--port <port>', 'Port number', '3020')
  .action((opts: { port: string }) => {
    const port = parseInt(opts.port, 10);
    process.env.PORT = String(port);

    // Walk up from __dirname to find the monorepo root and load the server
    const candidates = [
      // When linked: __dirname = .npm-global/lib/node_modules/@crown/cli/dist
      path.resolve(__dirname, '../../server/dist/index.js'),
      // Direct monorepo run
      path.resolve(__dirname, '../../../server/dist/index.js'),
      // Fallback: same parent as @crown/cli
      path.resolve(__dirname, '../../../../server/dist/index.js'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          require(candidate);
          return;
        } catch (err) {
          console.error(chalk.red('Failed to start server:'), err);
          process.exit(1);
        }
      }
    }

    console.error(chalk.red('Server package not found.'));
    console.error(chalk.dim('Run `npm run build` in the monorepo root, then try again.'));
    process.exit(1);
  });

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}

program.parse(process.argv);
