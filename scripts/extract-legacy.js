/**
 * Extract legacy HTML into Astro content collections:
 *   games, activities, cocktails, shots, posts
 *
 * Supports override mapping via scripts/extract-map.json
 *
 * ENV FLAGS:
 *   FORCE=true   overwrite existing markdown
 *   DRY=true     do not write anything (preview)
 *
 * HOW CLASSIFICATION WORKS (order):
 *  1. Mapping override (exact relative path match)
 *  2. Path heuristics based on your provided folder structure
 *     - Drinks/CocktailRecipes  -> cocktails
 *     - Drinks/ShotRecipes      -> shots
 *     - Extras/Blog             -> posts
 *     - Extras/activities&minigames -> activities
 *     - GameCategories/...      -> games
 *     - Anything else with ingredients list -> cocktails/shots heuristic
 *     - Fallback: posts
 *
 * GAME TYPE (games.type) is derived from subfolder (CardGames -> card, etc.)
 *
 * SKIPS: Known index / category / sitemap / overview pages (config below).
 *
 * FRONTMATTER:
 *   Common: title, date (if found), cover, tags, excerpt
 *   games:  type, players, equipment
 *   cocktails/shots: ingredients[], method[]
 *   activities: (only base fields; you can extend by mapping overrides)
 *   posts: draft optional if add later manually
 *
 * IMAGES:
 *   If cover image is relative and exists in legacy/, it's copied to public/images/
 *
 * OVERRIDE (scripts/extract-map.json) example:
 * {
 *   "legacy/Extras/WheelOfFortune.html": { "collection": "activities" },
 *   "legacy/GameCategories/CardGames/speed-cards.html": { "collection": "games", "type": "card" },
 *   "legacy/Drinks/ShotRecipes/rainbow-bomb.html": { "collection": "shots" }
 * }
 *
 * SUMMARY printed at end.
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const ROOT = process.cwd();
const LEGACY_DIR = path.join(ROOT, 'legacy');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const PUBLIC_IMAGES_DIR = path.join(ROOT, 'public', 'images');
const MAP_PATH = path.join(ROOT, 'scripts', 'extract-map.json');

const FORCE = process.env.FORCE === 'true';
const DRY = process.env.DRY === 'true';

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

// Remove script/style etc.
td.addRule('stripScripts', {
  filter: ['script', 'style', 'noscript'],
  replacement: () => ''
});

// ---------- CONFIGURABLE LISTS ----------

// Filenames to skip (case-insensitive exact matches)
const SKIP_FILENAMES = new Set([
  'index.html',
  'drinks.html',
  'contact.html',
  'about.html',
  'extras.html',
  'sitemap.html',
  '404.html',
  'gamecategories.html',
  'cocktailsrecipes.html',
  'shotrecipes.html',
  'activities&minigames.html',
  'blog.html',
  'allgames.html',
  'cardgames.html',
  'coingames.html',
  'cupgames.html',
  'dicegames.html',
  'miscgames.html',
  'outdoorgames.html',
  'ponggames.html',
  '1v1games.html',
  'freeforallgames.html',
  'pairgames.html',
  'teamgames.html',
  'drinksearchtool.html' // treat as tool page; skip or map manually if desired
]);

// Map folder names (for games) to a "type" value in frontmatter
const TYPE_MAP = {
  cardgames: 'card',
  coingames: 'coin',
  cupgames: 'cup',
  dicegames: 'dice',
  miscgames: 'misc',
  outdoorgames: 'outdoor',
  ponggames: 'pong',
  '1v1games': '1v1',
  freeforallgames: 'free-for-all',
  pairgames: 'pair',
  teamgames: 'team'
};

// ---------- HELPERS ----------

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.html?$/i.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function loadOverrides() {
  if (!fs.existsSync(MAP_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  } catch (e) {
    console.warn('WARN: Failed to parse extract-map.json:', e.message);
    return {};
  }
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'item';
}

function firstNonEmpty(arr) {
  for (const v of arr) if (v && v.trim()) return v.trim();
  return '';
}

function relativePath(filePath) {
  return filePath.replace(ROOT + path.sep, '').replace(/\\/g, '/');
}

function copyImageIfLocal(src) {
  if (!src || /^https?:/i.test(src)) return src;
  // Normalize weird leading ./ or /
  const clean = src.replace(/^\.?\//, '');
  const possible = path.join(LEGACY_DIR, clean);
  ensureDir(PUBLIC_IMAGES_DIR);
  if (fs.existsSync(possible)) {
    const base = path.basename(clean).split('?')[0];
    const dest = path.join(PUBLIC_IMAGES_DIR, base);
    if (!fs.existsSync(dest)) {
      try {
        fs.copyFileSync(possible, dest);
        console.log(`Copied image → public/images/${base}`);
      } catch (e) {
        console.warn('Failed to copy image:', src, e.message);
      }
    }
    return `/images/${base}`;
  }
  return src;
}

// ---------- EXTRACTION ----------

function extractStructured(html, filePath) {
  const $ = cheerio.load(html);

  // Attempt to remove clutter (nav, footer)
  ['nav', 'header', 'footer', 'script', 'style'].forEach(sel => $(sel).remove());
  $('[class*="nav"],[class*="footer"],[id*="nav"]').remove();

  const title = firstNonEmpty([
    $('meta[property="og:title"]').attr('content'),
    $('h1').first().text(),
    $('title').text(),
    path.basename(filePath, '.html')
  ]);

  const cover = $('meta[property="og:image"]').attr('content')
    || $('img').first().attr('src')
    || '';

  const date = $('meta[name="date"]').attr('content')
    || $('time[datetime]').attr('datetime')
    || '';

  const rawText = $('body').text();

  // Excerpt: first substantial paragraph
  const excerpt = $('p').map((_, p) => $(p).text().trim()).get()
    .find(p => p.length > 30 && p.length < 300) || '';

  // Players pattern
  const playersMatch = rawText.match(/(\d+\s*(?:-\s*\d+)?|\d+\+)\s+players?/i);
  const players = playersMatch ? playersMatch[1].replace(/\s+/g, '') : '';

  // Equipment (look for heading "Equipment")
  let equipment = [];
  $('h2,h3').each((_, el) => {
    const t = $(el).text().trim();
    if (/equipment/i.test(t)) {
      const next = $(el).next();
      if (next.is('ul,ol')) {
        equipment = next.find('li').map((_, li) => $(li).text().trim()).get();
      }
    }
  });

  // Ingredients + method (drinks)
  let ingredients = [];
  let method = [];
  $('h2,h3').each((_, el) => {
    const t = $(el).text().trim();
    if (/ingredients?/i.test(t)) {
      const list = $(el).next();
      if (list.is('ul,ol')) {
        ingredients = list.find('li').map((_, li) => $(li).text().trim()).get();
      }
    }
    if (/(method|instructions|steps)/i.test(t)) {
      const list = $(el).next();
      if (list.is('ul,ol')) {
        method = list.find('li').map((_, li) => $(li).text().trim()).get();
      }
    }
  });

  // Tags (meta keywords if present)
  let tags = [];
  const mk = $('meta[name="keywords"]').attr('content');
  if (mk) {
    tags = mk.split(',').map(s => s.trim()).filter(Boolean);
  }

  const mainHtml = $('main').html() || $('article').html() || $('body').html() || '';
  const markdown = td.turndown(mainHtml);

  return {
    title,
    cover,
    date,
    excerpt,
    players,
    equipment,
    ingredients,
    method,
    tags,
    rawText,
    markdown
  };
}

// ---------- CLASSIFICATION ----------

function classify(relPath, extracted, overrides) {
  // 1. Override mapping
  if (overrides[relPath]?.collection) {
    return overrides[relPath].collection;
  }

  const lower = relPath.toLowerCase();

  // Skip overview / index pages if they slipped through
  if (SKIP_FILENAMES.has(path.basename(lower))) return null;

  // Drinks
  if (lower.includes('/drinks/cocktailrecipes/')) return 'cocktails';
  if (lower.includes('/drinks/shotrecipes/')) return 'shots';

  // Extras subfolders
  if (lower.includes('/extras/blog/')) return 'posts';
  if (lower.includes('/extras/activities&minigames/')) return 'activities';

  // Game categories
  if (lower.includes('/gamecategories/')) return 'games';

  // Heuristic: ingredients => drink
  if (extracted.ingredients.length) {
    if (extracted.ingredients.length <= 4 || /shot/i.test(extracted.title))
      return 'shots';
    return 'cocktails';
  }

  // Fallback: if 'game' words appear
  if (/game/i.test(extracted.rawText)) return 'games';

  // Final fallback
  return 'posts';
}

function deriveGameType(relPath) {
  // Extract the folder name after /GameCategories/
  const match = relPath.toLowerCase().match(/gamecategories\/([^/]+)/);
  if (match) {
    const folder = match[1];
    if (TYPE_MAP[folder]) return TYPE_MAP[folder];
    const cleaned = folder.replace(/games$/, '');
    if (TYPE_MAP[cleaned + 'games']) return TYPE_MAP[cleaned + 'games'];
    return cleaned || 'misc';
  }
  return 'misc';
}

// ---------- FRONTMATTER BUILD ----------

function buildFrontmatter(collection, slug, extracted, relPath, overrides) {
  const fm = {};
  fm.title = extracted.title || slug;
  if (extracted.date) fm.date = extracted.date;
  if (extracted.cover) fm.cover = copyImageIfLocal(extracted.cover);
  if (extracted.tags.length) fm.tags = extracted.tags;
  if (extracted.excerpt) fm.excerpt = extracted.excerpt;

  if (collection === 'games') {
    fm.type = deriveGameType(relPath);
    if (extracted.players) fm.players = extracted.players;
    if (extracted.equipment.length) fm.equipment = extracted.equipment;
  }

  if (collection === 'cocktails' || collection === 'shots') {
    if (extracted.ingredients.length) fm.ingredients = extracted.ingredients;
    if (extracted.method.length) fm.method = extracted.method;
  }

  // Mapping override property merges (e.g. specify type or difficulty)
  if (overrides[relPath]) {
    for (const [k, v] of Object.entries(overrides[relPath])) {
      if (k === 'collection') continue;
      fm[k] = v;
    }
  }

  return fm;
}

// ---------- WRITE OUTPUT ----------

function yamlEscape(val) {
  if (typeof val !== 'string') return JSON.stringify(val);
  if (val === '' || /[:{}[\],&*#?|<>=!%@`]/.test(val) || /^\d/.test(val)) {
    return JSON.stringify(val);
  }
  if (/\n/.test(val)) return JSON.stringify(val);
  return val;
}

function frontmatterToString(obj) {
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      v.forEach(item => lines.push(`  - ${yamlEscape(item)}`));
    } else if (typeof v === 'object' && v !== null) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else {
      lines.push(`${k}: ${yamlEscape(v)}`);
    }
  }
  return lines.join('\n');
}

function writeMarkdown(collection, slug, fm, body, summary, relPath) {
  const dir = path.join(CONTENT_DIR, collection);
  ensureDir(dir);
  const file = path.join(dir, `${slug}.md`);

  if (fs.existsSync(file) && !FORCE) {
    console.log(`Skip (exists): ${collection}/${slug}.md`);
    summary.skipped++;
    return;
  }

  const content = `---\n${frontmatterToString(fm)}\n---\n\n${body.trim()}\n`;

  if (DRY) {
    console.log(`[DRY] Would write: ${collection}/${slug}.md (from ${relPath})`);
  } else {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Wrote: ${collection}/${slug}.md`);
  }
  summary[collection] = (summary[collection] || 0) + 1;
}

// ---------- MAIN PROCESS ----------

function processFile(filePath, overrides, summary) {
  const rel = relativePath(filePath);

  const baseNameLower = path.basename(rel).toLowerCase();
  if (SKIP_FILENAMES.has(baseNameLower)) {
    console.log(`Skip (listed skip): ${rel}`);
    summary.skipped++;
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const extracted = extractStructured(raw, filePath);
  const slug = slugify(extracted.title);
  const collection = classify(rel, extracted, overrides);

  if (!collection) {
    console.log(`Skip (no collection resolved): ${rel}`);
    summary.skipped++;
    return;
  }

  const fm = buildFrontmatter(collection, slug, extracted, rel, overrides);
  writeMarkdown(collection, slug, fm, extracted.markdown || '', summary, rel);
}

function main() {
  if (!fs.existsSync(LEGACY_DIR)) {
    console.log('No legacy directory found. Nothing to do.');
    return;
  }

  const overrides = loadOverrides();
  const files = walk(LEGACY_DIR);

  if (!files.length) {
    console.log('No HTML files under legacy/.');
    return;
  }

  console.log(`Found ${files.length} legacy HTML files.`);
  const summary = { games: 0, activities: 0, cocktails: 0, shots: 0, posts: 0, skipped: 0 };
  files.forEach(f => {
    try {
      processFile(f, overrides, summary);
    } catch (e) {
      console.warn(`Failed ${relativePath(f)}: ${e.message}`);
      summary.skipped++;
    }
  });

  console.log('--------- SUMMARY ---------');
  console.log(JSON.stringify(summary, null, 2));
  if (DRY) {
    console.log('DRY RUN complete – no files were written.');
  } else {
    console.log('Extraction complete.');
  }
}

main();
