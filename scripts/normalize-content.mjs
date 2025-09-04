#!/usr/bin/env node
/**
 * normalize-content.mjs
 *
 * Actions:
 *  1. Replace all occurrences of /BeerGoggleGames/images/ with /images/ in any .md or .mdx under src/content.
 *  2. In drink pages (path includes /drinks/), convert ONLY the Ingredients section (<DrinkSection title="Ingredients"...>)
 *     from <ol>...</ol> to <ul>...</ul>. Other ordered lists (e.g. Recipe steps) remain untouched.
 *
 * Usage:
 *   node scripts/normalize-content.mjs          # apply changes
 *   node scripts/normalize-content.mjs --dry    # show what would change
 */

import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const DRY_RUN = process.argv.includes('--dry');
const OLD_PREFIX = '/BeerGoggleGames/images/';
const NEW_PREFIX = '/images/';
const CONTENT_ROOT = path.join(process.cwd(), 'src', 'content');

let scanned = 0;
let changed = 0;
const changeLog = [];

async function main() {
  const rootStat = await fs.stat(CONTENT_ROOT).catch(() => null);
  if (!rootStat) {
    console.error(`Content root not found: ${CONTENT_ROOT}`);
    process.exit(1);
  }
  await walk(CONTENT_ROOT);

  console.log(`Scanned ${scanned} file(s).`);
  if (changed === 0) {
    console.log('No changes needed.');
  } else {
    console.log(`Changed ${changed} file(s):`);
    for (const line of changeLog) console.log('  - ' + line);
    if (DRY_RUN) console.log('(Dry run: no files written)');
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full);
    } else if (/\.(md|mdx)$/i.test(e.name)) {
      await processFile(full);
    }
  }
}

async function processFile(fullPath) {
  scanned++;
  let text = await fs.readFile(fullPath, 'utf8');
  const rel = path.relative(process.cwd(), fullPath);
  let original = text;
  let mutated = false;

  // 1. Global image prefix replacement
  if (text.includes(OLD_PREFIX)) {
    text = text.split(OLD_PREFIX).join(NEW_PREFIX);
    changeLog.push(`Updated image paths in ${rel}`);
    mutated = true;
  }

  // 2. Ingredients section transformation (drinks only)
  if (rel.includes('/drinks/')) {
    const before = text;
    text = transformIngredientsSection(text, rel);
    if (text !== before) mutated = true;
  }

  if (mutated) {
    changed++;
    if (!DRY_RUN) {
      await fs.writeFile(fullPath, text, 'utf8');
    }
  }
}

function transformIngredientsSection(source, rel) {
  // Regex to find <DrinkSection ... title="Ingredients" ...> ... </DrinkSection>
  return source.replace(
    /<DrinkSection([^>]*?\btitle\s*=\s*["']Ingredients["'][^>]*)>([\s\S]*?)<\/DrinkSection>/gi,
    (match, attrs, inner) => {
      const newInner = inner
        .replace(/<ol(\s[^>]*)?>/gi, '<ul$1>')
        .replace(/<\/ol>/gi, '</ul>');
      if (newInner !== inner) {
        changeLog.push(`Converted Ingredients <ol>→<ul> in ${rel}`);
      }
      return `<DrinkSection${attrs}>${newInner}</DrinkSection>`;
    }
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
