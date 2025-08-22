/**
 * Legacy HTML → Astro content collections (games, activities, cocktails, shots, posts)
 * Improvements:
 *  - Treat "example" (and variants) as generic → fall back to filename
 *  - Proper diacritic stripping (piña → pina, jäger → jager)
 *  - Skip vocalgames.html category index
 *  - Prevent placeholder "example(-n)" slugs
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

td.addRule('stripScripts', {
  filter: ['script', 'style', 'noscript'],
  replacement: () => ''
});

// ---------- CONFIG ----------

const BRAND_NAMES = new Set([
  'beergogglegames',
  'beer goggle games',
  'beer gogglegames',
  'beergoggle games'
]);

const GENERIC_TITLES = new Set([
  'cocktail recipes',
  'shot recipes',
  'blog',
  'activities & minigames',
  'activities and minigames',
  'game categories',
  'drinks',
  'extras',
  'home',
  'example' // NEW
]);

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
  'drinksearchtool.html',
  'vocalgames.html' // NEW skip
]);

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
  teamgames: 'team',
  vocalgames: 'vocal'
};

// ---------- UTIL ----------

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function relativePath(fp) { return fp.replace(ROOT + path.sep, '').replace(/\\/g, '/'); }

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir)) {
    const full = path.join(dir, e);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.html?$/i.test(e)) out.push(full);
  }
  return out;
}

function loadOverrides() {
  if (!fs.existsSync(MAP_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')); }
  catch { console.warn('WARN: Bad extract-map.json'); return {}; }
}

// Diacritic-safe slugify
function slugify(str) {
  return (str || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')     // remove diacritics
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'item';
}

function humanizeFilename(filePath) {
  let base = path.basename(filePath, path.extname(filePath));
  // Replace camelCase / PascalCase boundaries with space
  base = base.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Digits-letter
  base = base.replace(/([0-9])([A-Za-z])/g, '$1 $2');
  // Underscores / hyphens / & -> spacing
  base = base.replace(/[_-]+/g, ' ');
  base = base.replace(/&/g, ' & ');
  base = base.replace(/\s{2,}/g, ' ').trim();
  return base.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
}

function normalizeTitle(t) {
  return (t || '').trim().replace(/\s+/g, ' ');
}

function looksGeneric(title) {
  if (!title) return true;
  const norm = title.toLowerCase();
  if (BRAND_NAMES.has(norm)) return true;
  if (GENERIC_TITLES.has(norm)) return true;
  return false;
}

function copyImageIfLocal(src) {
  if (!src || /^https?:/i.test(src)) return src;
  const clean = src.replace(/^\.?\//, '');
  const candidate = path.join(LEGACY_DIR, clean);
  ensureDir(PUBLIC_IMAGES_DIR);
  if (fs.existsSync(candidate)) {
    const base = path.basename(clean).split('?')[0];
    const dest = path.join(PUBLIC_IMAGES_DIR, base);
    if (!fs.existsSync(dest)) {
      try {
        fs.copyFileSync(candidate, dest);
        console.log(`Copied image → public/images/${base}`);
      } catch (e) {
        console.warn('Image copy failed:', src, e.message);
      }
    }
    return `/images/${base}`;
  }
  return src;
}

function firstNonEmpty(arr) {
  for (const v of arr) if (v && v.trim()) return v.trim();
  return '';
}

// ---------- EXTRACTION ----------

function extractStructured(html, filePath) {
  const $ = cheerio.load(html);

  ['nav', 'header', 'footer', 'script', 'style'].forEach(sel => $(sel).remove());
  $('[class*="nav"],[class*="footer"],[id*="nav"]').remove();

  const metaTitle = $('meta[property="og:title"]').attr('content') || '';
  const h1Text = $('h1').first().text();
  const docTitle = $('title').text();

  let titleCandidate = normalizeTitle(firstNonEmpty([h1Text, metaTitle, docTitle]));

  // If first candidate generic, look for any other h1 that isn't
  if (looksGeneric(titleCandidate)) {
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
    const alt = h1s.find(t => !looksGeneric(t));
    if (alt) titleCandidate = normalizeTitle(alt);
  }

  if (looksGeneric(titleCandidate)) {
    titleCandidate = humanizeFilename(filePath);
  }

  // Clean site name residues
  titleCandidate = titleCandidate.replace(/\(.*beergogglegames.*\)/i, '').trim();

  // Avoid placeholder titles that reduce to 'example'
  if (looksGeneric(titleCandidate) || /^example$/i.test(titleCandidate)) {
    titleCandidate = humanizeFilename(filePath);
  }

  const cover = $('meta[property="og:image"]').attr('content')
    || $('img').first().attr('src')
    || '';

  const date = $('meta[name="date"]').attr('content')
    || $('time[datetime]').attr('datetime')
    || '';

  const rawText = $('body').text();

  const excerpt = $('p').map((_, p) => $(p).text().trim()).get()
    .find(p => p.length > 30 && p.length < 300) || '';

  const playersMatch = rawText.match(/(\d+\s*(?:-\s*\d+)?|\d+\+)\s+players?/i);
  const players = playersMatch ? playersMatch[1].replace(/\s+/g, '') : '';

  let equipment = [];
  $('h2,h3').each((_, el) => {
    const t = $(el).text().trim();
    if (/equipment/i.test(t)) {
      const n = $(el).next();
      if (n.is('ul,ol')) {
        equipment = n.find('li').map((_, li) => $(li).text().trim()).get();
      }
    }
  });

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

  let tags = [];
  const mk = $('meta[name="keywords"]').attr('content');
  if (mk) tags = mk.split(',').map(s => s.trim()).filter(Boolean);

  const mainHtml = $('main').html() || $('article').html() || $('body').html() || '';
  const markdown = td.turndown(mainHtml);

  return {
    title: titleCandidate,
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

function classify(rel, data, overrides) {
  if (overrides[rel]?.collection) return overrides[rel].collection;
  const bn = path.basename(rel).toLowerCase();
  if (SKIP_FILENAMES.has(bn)) return null;

  const lower = rel.toLowerCase();
  if (lower.includes('/drinks/cocktailrecipes/')) return 'cocktails';
  if (lower.includes('/drinks/shotrecipes/')) return 'shots';
  if (lower.includes('/extras/blog/')) return 'posts';
  if (lower.includes('/extras/activities&minigames/')) return 'activities';
  if (lower.includes('/gamecategories/')) return 'games';

  if (data.ingredients.length) {
    if (data.ingredients.length <= 4 || /shot/i.test(data.title)) return 'shots';
    return 'cocktails';
  }
  if (/game/i.test(data.rawText)) return 'games';
  return 'posts';
}

function deriveGameType(rel) {
  const m = rel.toLowerCase().match(/gamecategories\/([^/]+)/);
  if (m) {
    const folder = m[1];
    if (TYPE_MAP[folder]) return TYPE_MAP[folder];
    const cleaned = folder.replace(/games$/, '');
    if (TYPE_MAP[cleaned + 'games']) return TYPE_MAP[cleaned + 'games'];
    return cleaned || 'misc';
  }
  return 'misc';
}

// ---------- FRONTMATTER ----------

function buildFrontmatter(collection, slug, data, rel, overrides) {
  const fm = {};
  fm.title = data.title || slug;
  if (data.date) fm.date = data.date;
  if (data.cover) fm.cover = copyImageIfLocal(data.cover);
  if (data.tags.length) fm.tags = data.tags;
  if (data.excerpt) fm.excerpt = data.excerpt;

  if (collection === 'games') {
    fm.type = deriveGameType(rel);
    if (data.players) fm.players = data.players;
    if (data.equipment.length) fm.equipment = data.equipment;
  }
  if (collection === 'cocktails' || collection === 'shots') {
    if (data.ingredients.length) fm.ingredients = data.ingredients;
    if (data.method.length) fm.method = data.method;
  }

  if (overrides[rel]) {
    for (const [k, v] of Object.entries(overrides[rel])) {
      if (k === 'collection') continue;
      fm[k] = v;
    }
  }
  return fm;
}

// ---------- YAML ----------

function yamlEscape(val) {
  if (typeof val !== 'string') return JSON.stringify(val);
  if (val === '' || /[:{}[\],&*#?|<>=!%@`]/.test(val) || /^\d/.test(val) || /\n/.test(val))
    return JSON.stringify(val);
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

// ---------- WRITE ----------

function writeMarkdown(collection, slug, fm, body, summary, rel, usedSlugs) {
  // Fallback to humanized filename if slug is 'example' (paranoid)
  if (/^example(-\d+)?$/.test(slug)) {
    const human = humanizeFilename(rel);
    const alt = slugify(human);
    if (alt && alt !== 'example') slug = alt;
  }

  const dir = path.join(CONTENT_DIR, collection);
  ensureDir(dir);

  let finalSlug = slug;
  let i = 2;
  while (usedSlugs.has(`${collection}:${finalSlug}`)) {
    finalSlug = `${slug}-${i++}`;
  }
  usedSlugs.add(`${collection}:${finalSlug}`);

  const file = path.join(dir, `${finalSlug}.md`);

  if (fs.existsSync(file) && !FORCE) {
    console.log(`Skip (exists): ${collection}/${finalSlug}.md`);
    summary.skipped++;
    return;
  }

  const content = `---\n${frontmatterToString(fm)}\n---\n\n${body.trim()}\n`;

  if (DRY) {
    console.log(`[DRY] Would write: ${collection}/${finalSlug}.md (from ${rel})`);
  } else {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Wrote: ${collection}/${finalSlug}.md`);
  }
  summary[collection] = (summary[collection] || 0) + 1;
}

// ---------- PROCESS ----------

function processFile(filePath, overrides, summary, usedSlugs) {
  const rel = relativePath(filePath);
  const baseLower = path.basename(rel).toLowerCase();
  if (SKIP_FILENAMES.has(baseLower)) {
    console.log(`Skip (listed skip): ${rel}`);
    summary.skipped++;
    return;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const data = extractStructured(html, filePath);

  if (overrides[rel]?.title) data.title = overrides[rel].title;

  const collection = classify(rel, data, overrides);
  if (!collection) {
    console.log(`Skip (no collection): ${rel}`);
    summary.skipped++;
    return;
  }

  let slug = slugify(data.title);
  if (!slug || /^example$/.test(slug)) {
    slug = slugify(humanizeFilename(filePath));
  }

  const fm = buildFrontmatter(collection, slug, data, rel, overrides);
  writeMarkdown(collection, slug, fm, data.markdown || '', summary, rel, usedSlugs);
}

function main() {
  if (!fs.existsSync(LEGACY_DIR)) {
    console.log('No legacy directory.');
    return;
  }
  const overrides = loadOverrides();
  const files = walk(LEGACY_DIR);
  if (!files.length) {
    console.log('No HTML files found.');
    return;
  }
  console.log(`Found ${files.length} legacy HTML files.`);
  const summary = { games: 0, activities: 0, cocktails: 0, shots: 0, posts: 0, skipped: 0 };
  const usedSlugs = new Set();
  files.forEach(f => {
    try {
      processFile(f, overrides, summary, usedSlugs);
    } catch (e) {
      console.warn(`Failed ${relativePath(f)}: ${e.message}`);
      summary.skipped++;
    }
  });
  console.log('--------- SUMMARY ---------');
  console.log(JSON.stringify(summary, null, 2));
  if (DRY) console.log('DRY RUN complete – no files written.');
  else console.log('Extraction complete.');
}

main();
