import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { load as loadHtml } from 'cheerio';

const root = process.cwd();
const legacyDir = path.join(root, 'legacy');

const outContent = path.join(root, 'src', 'content');
const outPublic = path.join(root, 'public');

const collections = ['games', 'cocktails', 'shots', 'posts'];
for (const c of collections) ensureDir(path.join(outContent, c));
ensureDir(outPublic);

const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'dist', '.astro', '.vercel', 'out', '.github']);

const GAME_TYPES = ['pong', 'dice', 'cup', 'card', 'coin', 'vocal', 'outdoor', 'misc'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (EXCLUDE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(html?|mdx?)$/i.test(e.name)) yield full;
  }
}

function slugify(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function pickTitle($, fallback) {
  const og = $('meta[property="og:title"]').attr('content');
  const h1 = $('h1').first().text().trim();
  const t = $('title').first().text().trim();
  return og || h1 || t || fallback;
}

function pickContent($) {
  const selectors = ['main', 'article', '#content', '#main', '.content', '.post-content', '[role="main"]', 'body'];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length && el.html() && el.html().trim().length > 0) return el;
  }
  return $('body');
}

function classify(relPath) {
  const p = relPath.toLowerCase();
  if (p.includes('shot')) return { collection: 'shots' };
  if (p.includes('cocktail')) return { collection: 'cocktails' };
  if (p.includes('blog') || p.includes('post')) return { collection: 'posts' };
  if (p.includes('game')) {
    const type = GAME_TYPES.find(t => p.includes(t)) || 'misc';
    return { collection: 'games', type };
  }
  if (p.includes('drink')) return { collection: p.includes('cock') ? 'cocktails' : 'shots' };
  return null;
}

function rewriteSrcs($) {
  $('img, source').each((_, el) => {
    const $el = $(el);
    const attr = $el.attr('srcset') ? 'srcset' : 'src';
    const val = $el.attr(attr);
    if (!val) return;
    const parts = attr === 'srcset' ? val.split(',') : [val];
    const rewritten = parts.map(part => {
      const [url, descriptor] = part.trim().split(/\s+/, 2);
      if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return part.trim();
      const normalized = url.replace(/^\.?\/*/, '');
      const withBase = `/BeerGoggleGames/${normalized}`;
      return descriptor ? `${withBase} ${descriptor}` : withBase;
    });
    $el.attr(attr, attr === 'srcset' ? rewritten.join(', ') : rewritten[0]);
  });

  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (!href) return;
    if (/^https?:\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:')) return;
    const normalized = href.replace(/^\.?\/*/, '');
    $el.attr('href', `/BeerGoggleGames/${normalized}`);
  });
}

function frontmatter(obj) {
  const toYaml = (o, indent = '') => Object.entries(o)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length === 0) return `${indent}${k}: []`;
        const items = v.map(i => `${indent}  - ${String(i)}`).join('\n');
        return `${indent}${k}:\n${items}`;
      }
      return `${indent}${k}: ${String(v).replace(/\r?\n/g, ' ')}`;
    }).join('\n');

  return `---\n${toYaml(obj)}\n---\n\n`;
}

async function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fsp.copyFile(s, d);
  }
}

async function cleanupMdxFiles() {
  console.log('Cleaning up existing .mdx files in src/content...');
  let renamedCount = 0;
  
  for (const collection of collections) {
    const collectionDir = path.join(outContent, collection);
    if (!fs.existsSync(collectionDir)) continue;
    
    const entries = await fsp.readdir(collectionDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.mdx')) {
        const oldPath = path.join(collectionDir, entry.name);
        const newPath = path.join(collectionDir, entry.name.replace(/\.mdx$/, '.md'));
        
        await fsp.rename(oldPath, newPath);
        renamedCount++;
        console.log(`Renamed: ${path.relative(root, oldPath)} → ${path.relative(root, newPath)}`);
      }
    }
  }
  
  if (renamedCount > 0) {
    console.log(`Successfully renamed ${renamedCount} .mdx files to .md`);
  } else {
    console.log('No .mdx files found to rename');
  }
}

async function migrate() {
  if (!fs.existsSync(legacyDir)) {
    console.log('Legacy folder not found. Make sure the workflow checked out benbarraclough/beergogglegames-old to ./legacy');
    process.exit(0);
  }

  // Clean up any existing .mdx files first
  await cleanupMdxFiles();

  let counts = { games: 0, cocktails: 0, shots: 0, posts: 0, skipped: 0 };

  for (const file of walk(legacyDir)) {
    if (!/\.html?$/i.test(file)) continue;

    const rel = path.relative(legacyDir, file);
    const cls = classify(rel);
    if (!cls) { counts.skipped++; continue; }

    const raw = await fsp.readFile(file, 'utf8');
    const $ = loadHtml(raw, { decodeEntities: false });

    const baseName = path.basename(file, path.extname(file));
    const parent = path.basename(path.dirname(file));
    const fallbackSlug = slugify(baseName === 'index' ? parent : baseName);

    const title = pickTitle($, fallbackSlug.replace(/-/g, ' '));
    const slug = slugify(title) || fallbackSlug;

    const $main = pickContent($);
    rewriteSrcs($);

    const html = ($main.html() || '').trim();
    if (!html) { counts.skipped++; continue; }

    let data = { title, tags: [] };
    if (cls.collection === 'games') data.type = cls.type || 'misc';

    if (cls.collection === 'posts') {
      const metaDate = $('meta[property="article:published_time"]').attr('content') ||
                       $('time[datetime]').attr('datetime') ||
                       $('time').first().text().trim();
      if (metaDate) data.date = metaDate;
    }

    const front = frontmatter(data);
    const mdxBody = `${front}${html}\n`;

    const dest = path.join(outContent, cls.collection, `${slug}.md`);
    ensureDir(path.dirname(dest));
    await fsp.writeFile(dest, mdxBody, 'utf8');

    counts[cls.collection]++;
    console.log(`+ ${cls.collection}/${slug}.md`);
  }

  const assetDirs = ['images', 'img', 'assets', 'static', 'media', 'uploads'];
  for (const dir of assetDirs) {
    await copyDir(path.join(legacyDir, dir), path.join(outPublic, dir));
  }

  console.log('Migration summary:', counts);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
