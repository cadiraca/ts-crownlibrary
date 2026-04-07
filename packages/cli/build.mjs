import { build } from 'esbuild';
import { readFileSync, writeFileSync, chmodSync } from 'fs';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/index.js',
  external: ['chalk'],
});

// Add shebang and remove any duplicate
let code = readFileSync('dist/index.js', 'utf8');
code = code.replace(/^#!.*\n/, '');
writeFileSync('dist/index.js', '#!/usr/bin/env node\n' + code);
chmodSync('dist/index.js', 0o755);

console.log('✓ Built dist/index.js');
