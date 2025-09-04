#!/usr/bin/env node
/**
 * check-deprecated-paths.mjs
 *
 * Scans src/content (and optionally src/components) for any remaining /BeerGoggleGames/images/ references.
 * Exits with code 1 if any are found (so a workflow step can fail).
 *
 * Usage:
 *   node scripts/check-deprecated-paths.mjs
 */

import { promises as fs } from 'fs';
import path from 'path';

const SEARCH_ROOTS = [
  path.join(process.cwd(), 'src', 'content'),
  path.join(process.cwd(), 'src', 'components')
];

const NEEDLE = '/BeerGoggleGames/images/';
let hits = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full);
    } else if (/\.(md|mdx|astro|js|ts|tsx|jsx|cjs|mjs|css|scss)$/i.test(e.name)) {
      const text = await fs.readFile(full, 'utf8').catch(() => '');
      if (text.includes(NEEDLE)) {
        const rel = path.relative(process.cwd(), full);
        const lines = text.split(/\r?\n/);
        lines.forEach((line, idx) => {
          if (line.includes(NEEDLE)) {
            hits.push(`${rel}:${idx + 1}:${line.trim()}`);
          }
        });
      }
    }
  }
}

async function main() {
  for (const root of SEARCH_ROOTS) {
    const exists = await fs.stat(root).catch(() => null);
    if (exists) await walk(root);
  }
  if (hits.length) {
    console.error('Deprecated image prefix still present in:');
    hits.forEach(h => console.error('  ' + h));
    process.exit(1);
  } else {
    console.log('No deprecated image prefixes found.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
