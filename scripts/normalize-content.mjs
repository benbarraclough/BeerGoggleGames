#!/usr/bin/env node
/**
 * normalize-content.mjs
 *
 * Actions:
 *  1. Replace all occurrences of /BeerGoggleGames/images/ with /images/ in any .md / .mdx under src/content.
 *  2. In drink pages (path includes /drinks/), convert ONLY <DrinkSection title="Ingredients"...> inner <ol>...</ol> to <ul>...</ul>.
 *  3. (Optional assist) If a line has cover="/BeerGoggleGames/images/xxx" or <GameHero cover="..."> it is covered by (1).
 *
 * Flags:
 *   --dry       : do not write changes, just report
 *   --verbose   : list every scanned file and whether it changed
 *
 * Exit code:
 *   0 success (even if no changes)
 *   >0 on error
 */

import { promises as fs } from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry');
const VERBOSE = process.argv.includes('--verbose');
const ROOT = path.join(process.cwd(), 'src', 'content');
const OLD = '/BeerGoggleGames/images/';
const NEW = '/images/';

let scanned = 0;
let mutatedFiles = 0;
const changeLog = [];

async function run() {
  const ok = await fs.stat(ROOT).catch(()=>null);
  if (!ok) {
    console.error(`ERROR: Content root missing: ${ROOT}`);
    process.exit(1);
  }
  await walk(ROOT);
  console.log(`Scanned ${scanned} file(s).`);
  if (mutatedFiles === 0) {
    console.log('No changes needed.');
  } else {
    console.log(`Changed ${mutatedFiles} file(s):`);
    for (const line of changeLog) console.log('  - ' + line);
    if (DRY) console.log('(Dry run: no files written)');
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

function transformIngredientsSection(source, rel) {
  if (!rel.includes('/drinks/')) return source;
  // Only touch DrinkSection titled Ingredients
  return source.replace(
    /<DrinkSection([^>]*?\btitle\s*=\s*["']Ingredients["'][^>]*)>([\s\S]*?)<\/DrinkSection>/gi,
    (whole, attrs, inner) => {
      const replaced = inner
        .replace(/<ol(\s[^>]*)?>/gi, '<ul$1>')
        .replace(/<\/ol>/gi, '</ul>');
      if (replaced !== inner) {
        changeLog.push(`Ingredients <ol>→<ul> in ${rel}`);
      }
      return `<DrinkSection${attrs}>${replaced}</DrinkSection>`;
    }
  );
}

async function processFile(full) {
  scanned++;
  let text = await fs.readFile(full, 'utf8');
  const rel = path.relative(process.cwd(), full);
  const original = text;
  let changed = false;

  if (text.includes(OLD)) {
    text = text.split(OLD).join(NEW);
    changeLog.push(`Image paths fixed in ${rel}`);
    changed = true;
  }

  const afterIngredients = transformIngredientsSection(text, rel);
  if (afterIngredients !== text) {
    text = afterIngredients;
    changed = true;
  }

  if (VERBOSE) {
    console.log(`${changed ? '[CHANGED]' : '[OK     ]'} ${rel}`);
  }

  if (changed) {
    mutatedFiles++;
    if (!DRY) {
      await fs.writeFile(full, text, 'utf8');
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
