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
import matter from 'gray-matter';

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

  // Remove markdown '***' dividers inside GameSection title="Setup" blocks (games only)
  if (rel.includes(path.join('src','content','games'))) {
    const before = text;
    text = text.replace(
      /<GameSection([^>]*?\btitle\s*=\s*["']Setup["'][^>]*)>([\s\S]*?)<\/GameSection>/gi,
      (whole, attrs, inner) => {
        const cleaned = inner.replace(/^[\t ]*\*\s*\*\s*\*[\t ]*$/gmi, '').replace(/\n{3,}/g, '\n\n');
        if (cleaned !== inner) {
          changeLog.push(`Removed '***' divider in Setup for ${rel}`);
        }
        return `<GameSection${attrs}>${cleaned}</GameSection>`;
      }
    );
    if (text !== before) changed = true;
  }

  // Activities & Blog cleanup: remove breadcrumbs, duplicate H1, heading icon images, Share/Feedback blocks, and star dividers
  if (rel.includes(path.join('src','content','activities')) || rel.includes(path.join('src','content','posts'))) {
    const before = text;
    const { data, content } = matter(text);
    let body = content;

    // 1) Remove leading duplicate H1 (first markdown heading like "# Something")
    body = body.replace(/^\s*#\s+.*\n+/, '');

    // 2) Remove breadcrumb ordered list at top (lines like "1. [Home](...)" etc.)
    body = body.replace(/^(?:\d+\.\s*\[[^\]]+\]\([^\)]+\)\s*\n){2,}\n*/m, '');

    // 3) Strip image icons appended to headings (e.g., "### Title ![icon](/images/..)")
    body = body.replace(/^(#{2,6}[^\n]*?)\s*!\[[^\]]*\]\([^\)]+\)\s*$/gm, '$1');

    // 4) Remove star dividers lines ("* * *" or "***") and collapse excessive blank lines
    body = body.replace(/^[\t ]*(\*\s*){3,}[\t ]*$/gmi, '').replace(/\n{3,}/g, '\n\n');

    // 5) Remove Share This Page section and following share links until next heading or EOF
    body = body.replace(/^[#>\s]*?\s*#{2,6}\s*Share\s+This\s+Page[\s\S]*?(?=^#{1,6}\s|\Z)/gmi, '');

    // 6) Remove Feedback section and trailing contact block
    body = body.replace(/^[#>\s]*?\s*#{2,6}\s*Feedback[\s\S]*$/gmi, '');

    // 7) Activities-specific: remove Type/Players lines
    if (rel.includes(path.join('src','content','activities'))) {
      body = body
        .replace(/^\s*\*\*Type:\*\*.*$/gmi, '')
        .replace(/^\s*\*\*Players\s+required:\*\*.*$/gmi, '')
        .replace(/\n{3,}/g, '\n\n');
    }

    // 8) Blog-specific: parse "Posted Month, Year" and move to frontmatter date; remove the line.
    if (rel.includes(path.join('src','content','posts'))) {
      const monthMap = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
      };
      const postedRe = /^\s*Posted\s+([A-Za-z]+),\s*(\d{4})\s*$/mi;
      const m = body.match(postedRe);
      if (m) {
        const mon = monthMap[m[1].toLowerCase()];
        const year = m[2];
        if (mon && !data.date) {
          data.date = `${year}-${mon}-01`;
          changeLog.push(`Blog date set from content in ${rel} => ${data.date}`);
        }
        body = body.replace(postedRe, '');
      }
      // Also strip any lingering breadcrumb-like lists that might remain
      body = body.replace(/^(?:\d+\.\s*\[[^\]]+\]\([^\)]+\)\s*\n){2,}\n*/m, '');
    }

    const rebuilt = matter.stringify(body.trim() + '\n', data);
    if (rebuilt !== text) {
      text = rebuilt;
      changed = true;
      // Describe changes succinctly
      const scope = rel.includes('/activities/') ? 'activity' : 'post';
      changeLog.push(`Normalized ${scope} content in ${rel}`);
    }
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
