#!/usr/bin/env node
/**
 * fix-images-and-ingredients.mjs
 *
 * Tasks:
 * 1. Replace *every* occurrence of the OLD image prefix inside content with /images/
 *    (scans ALL markdown / mdx in src/content recursively).
 * 2. Convert ONLY Ingredients sections in DRINK pages from <ol> to <ul>.
 * 3. Log detailed changes.
 *
 * Dry run: node scripts/fix-images-and-ingredients.mjs --dry
 */

import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const CONTENT_ROOT = path.join(process.cwd(), 'src', 'content');
const OLD_PREFIX = '/BeerGoggleGames/images/';
const NEW_PREFIX = '/images/';
const DRY_RUN = process.argv.includes('--dry');

let scanned = 0;
let changed = 0;
const changeLog = [];

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full);
    } else if (/\.(md|mdx)$/i.test(e.name)) {
      await processFile(full);
    }
  }
}

function convertIngredientsOlToUl(content, rel) {
  // Only target drink files (heuristic: path includes /drinks/)
  if (!/\/drinks\//.test(rel)) return content;

  const pattern = /<DrinkSection([^>]*?\btitle\s*=\s*["']Ingredients["'][^>]*)>([\s\S]*?)<\/DrinkSection>/gi;
  return content.replace(pattern, (match, attrs, inner) => {
    const replaced = inner
      .replace(/<ol(\s[^>]*)?>/gi, '<ul$1>')
      .replace(/<\/ol>/gi, '</ul>');
    if (replaced !== inner) {
      changeLog.push(`Converted Ingredients <ol>→<ul> in ${rel}`);
    }
    return `<DrinkSection${attrs}>${replaced}</DrinkSection>`;
  });
}

async function processFile(full) {
  scanned++;
  const rel = path.relative(process.cwd(), full);
  let text = await fs.readFile(full, 'utf8');
  let original = text;
  let fileChanged = false;

  if (text.includes(OLD_PREFIX)) {
    text = text.split(OLD_PREFIX).join(NEW_PREFIX);
    changeLog.push(`Replaced image prefix in ${rel}`);
    fileChanged = true;
  }

  // Ingredients section transformation (drinks only)
  const afterIngredients = convertIngredientsOlToUl(text, rel);
  if (afterIngredients !== text) {
    text = afterIngredients;
    fileChanged = true;
  }

  if (fileChanged) {
    changed++;
    if (!DRY_RUN) {
      await fs.writeFile(full, text, 'utf8');
    }
  }
}

async function main() {
  const exists = await fs.stat(CONTENT_ROOT).catch(() => null);
  if (!exists) {
    console.error('Content root not found:', CONTENT_ROOT);
    process.exit(1);
  }

  await walk(CONTENT_ROOT);

  console.log(`Scanned ${scanned} content file(s).`);
  if (changed === 0) {
    console.log('No changes required.');
  } else {
    console.log(`Changed ${changed} file(s):`);
    for (const line of changeLog) console.log('  - ' + line);
    if (DRY_RUN) console.log('(Dry run: changes not written)');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
