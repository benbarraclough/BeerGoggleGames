#!/usr/bin/env node
/**
 * check-deprecated-paths.mjs
 * Scans src/content + src/components for /BeerGoggleGames/images/ references.
 * Exits 1 if any found.
 */

import { promises as fs } from 'fs';
import path from 'path';

const SEARCH_DIRS = [
  path.join(process.cwd(), 'src', 'content'),
  path.join(process.cwd(), 'src', 'components')
];

const NEEDLE = '/BeerGoggleGames/images/';
let hits = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(()=>[]);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full);
    } else if (/\.(md|mdx|astro|js|jsx|ts|tsx|mjs|cjs|css|scss)$/i.test(e.name)) {
      const txt = await fs.readFile(full, 'utf8').catch(()=> '');
      if (txt.includes(NEEDLE)) {
        const lines = txt.split(/\r?\n/);
        lines.forEach((line, i) => {
          if (line.includes(NEEDLE)) {
            hits.push(`${path.relative(process.cwd(), full)}:${i+1}:${line.trim()}`);
          }
        });
      }
    }
  }
}

async function main() {
  for (const d of SEARCH_DIRS) {
    const exists = await fs.stat(d).catch(()=>null);
    if (exists) await walk(d);
  }
  if (hits.length) {
    console.error('Deprecated image prefix still present in:');
    hits.forEach(h => console.error('  ' + h));
    process.exit(1);
  }
  console.log('No deprecated image prefixes found.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
