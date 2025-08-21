/**
 * Extract legacy HTML into Astro content collections.
 * Run via: npm run extract-legacy
 * Environment flags:
 *   FORCE=true       overwrite existing slugs
 *   DRY=true         show actions without writing files
 *
 * Places Markdown files into:
 *   src/content/games
 *   src/content/cocktails
 *   src/content/shots
 *   src/content/posts
 *
 * Heuristics can be refined by editing functions near the bottom.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const LEGACY_DIR = path.join(ROOT, '..', 'legacy'); // repo root /legacy
const CONTENT_DIR = path.join(ROOT, '..', 'src', 'content');

const FORCE = process.env.FORCE === 'true';
const DRY = process.env.DRY === 'true';

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

td.addRule('stripScripts', {
  filter: ['script', 'style', 'noscript'],
  replacement: () => ''
});

function log(msg) { console.log(msg); }
function warn(msg) { console.warn(msg); }
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (entry.toLowerCase().endsWith('.html')) out.push(full);
  }
  return out;
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function firstNonEmpty(arr) {
  for (const v of arr) if (v && v.trim()) return v.trim();
  return '';
}

function classify(doc, filePath, extracted) {
  const p = filePath.toLowerCase();
  if (p.includes('/games/')) return { collection: 'games' };
  if (p.includes('/cocktail') || p.includes('/cocktails/')) return { collection: 'cocktails' };
  if (p.includes('/shot') || p.includes('/shots/')) return { collection: 'shots' };
  if (p.includes('/blog/') || p.includes('/posts/')) return { collection: 'posts' };

  // Ingredient heuristic -> drink
  if (extracted.ingredients.length) {
    if (extracted.ingredients.length <= 4 || /shot/i.test(extracted.title))
      return { collection: 'shots' };
    return { collection: 'cocktails' };
  }

  // Fallback to games if "rules" or "players" present
  if (extracted.players || extracted.equipment.length || /rules?/i.test(extracted.rawText))
    return { collection: 'games' };

  return { collection: 'posts' };
}

function extractStructured(html, filePath) {
  const $ = cheerio.load(html);

  // Title
  const title = firstNonEmpty([
    $('meta[property="og:title"]').attr('content'),
    $('h1').first().text(),
    $('title').text(),
    path.basename(filePath, '.html')
  ]);

  // Cover image candidate
  const cover = $('meta[property="og:image"]').attr('content')
    || $('img').first().attr('src')
    || '';

  // Date
  const dateMeta = $('meta[name="date"]').attr('content')
    || $('time').attr('datetime')
    || '';

  // Players
  const playersMatch = $('body').text().match(/(\d+[-–]?\d*)\s+players?/i);
  const players = playersMatch ? playersMatch[1] : '';

  // Equipment list heuristic (look for headings containing Equipment)
  let equipment = [];
  $('h2,h3').each((_, el) => {
    const txt = $(el).text().trim();
    if (/equipment/i.test(txt)) {
      let next = $(el).next();
      if (next.is('ul,ol')) {
        equipment = next.find('li').map((_, li) => $(li).text().trim()).get();
      }
    }
  });

  // Ingredients / Method (drinks)
  let ingredients = [];
  let method = [];
  $('h2,h3').each((_, el) => {
    const t = $(el).text().trim();
    if (/ingredients?/i.test(t)) {
      const next = $(el).next();
      if (next.is('ul,ol')) {
        ingredients = next.find('li').map((_, li) => $(li).text().trim()).get();
      }
    }
    if (/method|instructions|steps/i.test(t)) {
      const next = $(el).next();
      if (next.is('ol,ul')) {
        method = next.find('li').map((_, li) => $(li).text().trim()).get();
      }
    }
  });

  // Tags (meta keywords or guess)
  let tags = [];
  const metaKeywords = $('meta[name="keywords"]').attr('content');
  if (metaKeywords) {
    tags = metaKeywords.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    // crude guess: collect emphasized words early in document
    const ems = $('em,strong,b,i').slice(0, 10).map((_, el) => $(el).text().trim()).get();
    tags = [...new Set(ems.filter(w => w.length < 25))].slice(0, 6);
  }

  // Excerpt - first paragraph with meaningful text
  const excerpt = firstNonEmpty(
    $('p').map((_, p) => $(p).text().trim()).get().filter(p => p.length > 30 && p.length < 400)
  );

  const rawText = $('body').text();

  // Main content body: remove nav/footer etc heuristically
  ['nav', 'header', 'footer', 'script', 'style'].forEach(sel => $(sel).remove());
  // Optionally remove sidebars
  $('[class*="nav"],[class*="menu"],[class*="footer"],[id*="nav"]').remove();

  const mainHtml = $('main').html() || $('article').html() || $('body').html() || '';
  const markdown = td.turndown(mainHtml);

  return {
    title,
    cover,
    date: dateMeta,
    players,
    equipment,
    ingredients,
    method,
    tags,
    excerpt,
    markdown,
    rawText
  };
}

function deriveGameType(extracted, filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes('card')) return 'card';
  if (lower.includes('dice')) return 'dice';
  if (lower.includes('challenge')) return 'challenge';
  if (lower.includes('party')) return 'party';
  if (/quiz|trivia/.test(lower)) return 'trivia';
  if (extracted.players && parseInt(extracted.players) === 2) return '1v1';
  return 'misc';
}

function buildFrontmatter(collection, slug, extracted, filePath) {
  const fm = {};
  fm.title = extracted.title || slug;
  if (extracted.date) fm.date = extracted.date;
  if (extracted.cover) fm.cover = ensureImagePath(extracted.cover);
  if (extracted.tags.length) fm.tags = extracted.tags;
  if (collection === 'games') {
    fm.type = deriveGameType(extracted, filePath);
    if (extracted.players) fm.players = extracted.players;
    if (extracted.equipment.length) fm.equipment = extracted.equipment;
  }
  if (collection === 'cocktails' || collection === 'shots') {
    if (extracted.ingredients.length) fm.ingredients = extracted.ingredients;
    if (extracted.method.length) fm.method = extracted.method;
  }
  if (extracted.excerpt) fm.excerpt = extracted.excerpt;
  return fm;
}

function ensureImagePath(src) {
  if (!src) return '';
  if (/^https?:/i.test(src)) return src; // leave remote
  // Normalize relative -> /images/<basename>
  const base = path.basename(src).split('?')[0];
  const publicImages = path.join(ROOT, '..', 'public', 'images');
  ensureDir(publicImages);
  // Attempt to copy if original file exists relative to legacy root
  const candidate = path.join(LEGACY_DIR, src);
  if (fs.existsSync(candidate)) {
    const dest = path.join(publicImages, base);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(candidate, dest);
      log(`Copied image: ${base}`);
    }
  }
  return `/images/${base}`;
}

function writeMarkdown(collection, slug, frontmatter, body) {
  const dir = path.join(CONTENT_DIR, collection);
  ensureDir(dir);
  const file = path.join(dir, `${slug}.md`);
  if (fs.existsSync(file) && !FORCE) {
    log(`Skip (exists): ${collection}/${slug}.md`);
    return;
  }

  const frontLines = Object.entries(frontmatter).map(([k, v]) => {
    if (Array.isArray(v)) {
      return `${k}:\n${v.map(item => `  - ${yamlEscape(item)}`).join('\n')}`;
    }
    return `${k}: ${yamlScalar(v)}`;
  });

  const content = `---\n${frontLines.join('\n')}\n---\n\n${body.trim()}\n`;

  if (DRY) {
    log(`[DRY] Would write ${file}`);
  } else {
    fs.writeFileSync(file, content, 'utf8');
    log(`Wrote ${collection}/${slug}.md`);
  }
}

function yamlEscape(str) {
  if (typeof str !== 'string') return str;
  if (/[:#-]|^\d|["'\n]/.test(str)) {
    return JSON.stringify(str);
  }
  return str;
}
function yamlScalar(v) {
  if (typeof v === 'string') return yamlEscape(v);
  return JSON.stringify(v);
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const extracted = extractStructured(raw, filePath);
  const slug = slugify(extracted.title || path.basename(filePath, '.html'));
  const { collection } = classify(raw, filePath, extracted);
  const fm = buildFrontmatter(collection, slug, extracted, filePath);
  writeMarkdown(collection, slug, fm, extracted.markdown || '');
}

function main() {
  if (!fs.existsSync(LEGACY_DIR)) {
    warn(`No legacy directory found at ${LEGACY_DIR}. Nothing to do.`);
    return;
  }
  const files = walk(LEGACY_DIR);
  if (!files.length) {
    warn('No .html files found in legacy/.');
    return;
  }
  log(`Found ${files.length} legacy HTML files.`);
  files.forEach(f => {
    try {
      processFile(f);
    } catch (e) {
      warn(`Failed ${f}: ${e.message}`);
    }
  });
  log('Done.');
}

main();
