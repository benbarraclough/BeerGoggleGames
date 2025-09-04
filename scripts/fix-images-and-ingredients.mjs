#!/usr/bin/env node
/**
 * fix-images-and-ingredients.mjs
 *
 * Tasks:
 * 1. Replace all occurrences of "/BeerGoggleGames/images/" with "/images/" in
 *    game & drink content (Markdown / MDX).
 * 2. Convert ONLY the Ingredients section in drink pages from <ol>...</ol> to <ul>...</ul>
 *    (leaves other ordered lists like Recipe steps intact).
 *
 * Dry run: node scripts/fix-images-and-ingredients.mjs --dry
 *
 * Exits with:
 *   0 if no changes
 *   0 after applying changes (prints summary)
 *   >0 only on error
 */

import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const CONTENT_DIRS = [
  'src/content/games',
  'src/content/drinks'
];

const DRY_RUN = process.argv.includes('--dry');

let fileCountScanned = 0;
let fileCountChanged = 0;
const changeLog = [];

async function walk(dir) {
  let entries = [];
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

function rewriteIngredientsSection(source, relPath) {
  // Matches: <DrinkSection ... title="Ingredients" ...> ... </DrinkSection>
  // Non-greedy inside, DOTALL via [\s\S]
  return source.replace(
    /<DrinkSection([^>]*?\btitle\s*=\s*["']Ingredients["'][^>]*)>([\s\S]*?)<\/DrinkSection>/gi,
    (match, attrs, inner) => {
      const originalInner = inner;
      // Only replace top-level <ol> ... </ol> in this inner block
      const replaced = originalInner
        .replace(/<ol(\s[^>]*)?>/gi, '<ul$1>')
        .replace(/<\/ol>/gi, '</ul>');
      if (originalInner !== replaced) {
        changeLog.push(`Converted Ingredients <ol> to <ul> in ${relPath}`);
      }
      return `<DrinkSection${attrs}>${replaced}</DrinkSection>`;
    }
  );
}

async function processFile(fullPath) {
  fileCountScanned++;
  const rel = path.relative(process.cwd(), fullPath);
  let content = await fs.readFile(fullPath, 'utf8');
  let updated = content;

  // 1. Image path replacement
  if (updated.includes('/BeerGoggleGames/images/')) {
    updated = updated.replace(/\/BeerGoggleGames\/images\//g, '/images/');
    changeLog.push(`Replaced image paths in ${rel}`);
  }

  // 2. Ingredients list conversion (only for drinks)
  if (/\/drinks\//.test(rel)) {
    const before = updated;
    updated = rewriteIngredientsSection(updated, rel);
    if (before !== updated && !changeLog.at(-1)?.includes(rel)) {
      changeLog.push(`Modified Ingredients list in ${rel}`);
    }
  }

  if (updated !== content) {
    fileCountChanged++;
    if (!DRY_RUN) {
      await fs.writeFile(fullPath, updated, 'utf8');
    }
  }
}

async function main() {
  for (const dir of CONTENT_DIRS) {
    await walk(path.join(process.cwd(), dir));
  }

  console.log(`Scanned ${fileCountScanned} files.`);
  if (fileCountChanged === 0) {
    console.log('No changes needed.');
  } else {
    console.log(`Changed ${fileCountChanged} file(s):`);
    for (const line of changeLog) console.log('  - ' + line);
    if (DRY_RUN) {
      console.log('Dry run: no files written. Re-run without --dry to apply.');
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
