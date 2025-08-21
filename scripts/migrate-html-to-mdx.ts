/**
 * Migration script: converts your HTML into MDX content files and pages.
 * Usage:
 *   npm run migrate -- --from .
 *
 * Assumptions (from your structure):
 * - Top-level HTML pages: index, about, contact, extras, drinks, sitemap
 * - GameCategories/<Type>Games/*.html
 * - Drinks/CocktailRecipes/*.html
 * - Drinks/ShotRecipes/*.html
 * - Extras/glossary.html, Extras/forfeits.html, Extras/WheelOfFortune.html
 * - Extras/activities&minigames/*.html
 * - Extras/Blog/*.html (treated as posts without dates)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = process.cwd();
const FROM = getArg('--from', ROOT);

const SELECTORS = [
  'main',
  'article',
  '#content',
  '#main',
  '.content',
  'body'
];

const GAME_TYPE_MAP = new Map([
  ['CardGames', 'card'],
  ['CoinGames', 'coin'],
  ['CupGames', 'cup'],
  ['DiceGames', 'dice'],
  ['MiscGames', 'misc'],
  ['OutdoorGames', 'outdoor'],
  ['PongGames', 'pong'],
  ['VocalGames', 'vocal']
]);

function getArg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function slugify(str) {
  return String(str)
    .normalize('NFKD')
    .replace(/&/g, 'and')
    .replace(/['”“’‘"]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function extract($) {
  // Title: prefer first h1 text, fallback to title tag
  const h1 = $('h1').first().text().trim();
  const title = h1 || $('title').first().text().trim() || 'Untitled';
  // Content: pick first matching selector
  let $root;
  for (const sel of SELECTORS) {
    const el = $(sel).first();
    if (el && el.length) { $root = el; break; }
  }
  if (!$root) $root = $.root();

  // Remove obvious nav/footer artifacts if present
  $root.find('nav, header, footer, script, style').remove();

  // Convert relative img src to base-aware, but leave as plain MDX; frontmatter cover handled separately
  const html = $root.html() ?? '';
  return { title, html: html.trim() };
}

function toFrontmatter(obj) {
  const yaml = Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        const items = v.map(i => `  - ${String(i)}`).join('\n');
        return `${k}:\n${items}`;
      } else if (typeof v === 'string') {
        return `${k}: ${JSON.stringify(v)}`;
      } else {
        return `${k}: ${String(v)}`;
      }
    })
    .join('\n');
  return `---\n${yaml}\n---\n`;
}

async function writeMDX(dest, data, bodyHTML) {
  const fm = toFrontmatter(data);
  const content = `${fm}\n${bodyHTML}\n`;
  await ensureDir(path.dirname(dest));
  await fs.writeFile(dest, content, 'utf8');
}

async function migrateTopLevel() {
  // about.html → src/pages/about.astro (content can be pasted later if needed)
  const topPages = ['about', 'contact', 'extras'];
  for (const name of topPages) {
    const p = path.join(FROM, `${name}.html`);
    try {
      const raw = await fs.readFile(p, 'utf8');
      const $ = cheerio.load(raw);
      const { html } = extract($);
      const astroPath = path.join(ROOT, 'src', 'pages', `${name}.astro`);
      // Wrap in Layout
      const page = `---\nimport Layout from '../components/Layout.astro';\n---\n<Layout title="${name[0].toUpperCase() + name.slice(1)}">\n  <!-- migrated from ${name}.html -->\n  ${html}\n</Layout>\n`;
      await ensureDir(path.dirname(astroPath));
      await fs.writeFile(astroPath, page, 'utf8');
      console.log(`Migrated ${name}.html -> src/pages/${name}.astro`);
    } catch { /* skip if not present */ }
  }
}

async function migrateGames() {
  for (const [folder, type] of GAME_TYPE_MAP) {
    const dir = path.join(FROM, 'GameCategories', folder);
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (!ent.isFile() || !ent.name.toLowerCase().endsWith('.html')) continue;
      const srcPath = path.join(dir, ent.name);
      const raw = await fs.readFile(srcPath, 'utf8');
      const $ = cheerio.load(raw);
      const { title, html } = extract($);
      const slug = slugify(path.basename(ent.name, path.extname(ent.name)));
      const data = {
        title,
        type,
        format: undefined, // set later if you want (team, 1v1, pair, ffa)
        summary: undefined,
        tags: []
      };
      const dest = path.join(ROOT, 'src', 'content', 'games', `${slug}.mdx`);
      await writeMDX(dest, data, html);
      console.log(`Game: ${folder}/${ent.name} -> ${dest}`);
    }
  }
}

async function migrateDrinks() {
  // Cocktails
  for (const sub of [['CocktailRecipes', 'cocktails'], ['ShotRecipes', 'shots']]) {
    const [srcFolder, coll] = sub;
    const dir = path.join(FROM, 'Drinks', srcFolder);
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (!ent.isFile() || !ent.name.toLowerCase().endsWith('.html')) continue;
      const srcPath = path.join(dir, ent.name);
      const raw = await fs.readFile(srcPath, 'utf8');
      const $ = cheerio.load(raw);
      const { title, html } = extract($);
      const slug = slugify(path.basename(ent.name, path.extname(ent.name)));
      const data = {
        title,
        ingredients: [],
        method: [],
        glass: undefined,
        garnish: undefined,
        tags: []
      };
      const dest = path.join(ROOT, 'src', 'content', coll, `${slug}.mdx`);
      await writeMDX(dest, data, html);
      console.log(`Drink: ${srcFolder}/${ent.name} -> ${dest}`);
    }
  }
}

async function migrateExtras() {
  // Single pages
  const singles = [
    ['glossary.html', 'glossary.astro'],
    ['forfeits.html', 'forfeits.astro'],
    ['WheelOfFortune.html', 'wheel-of-fortune.astro']
  ];
  for (const [src, destName] of singles) {
    const srcPath = path.join(FROM, 'Extras', src);
    try {
      const raw = await fs.readFile(srcPath, 'utf8');
      const $ = cheerio.load(raw);
      const { html } = extract($);
      const dest = path.join(ROOT, 'src', 'pages', 'extras', destName);
      const page = `---\nimport Layout from '../../components/Layout.astro';\n---\n<Layout title="${path.basename(destName, path.extname(destName)).replace(/-/g, ' ')}">\n  <!-- migrated from Extras/${src} -->\n  ${html}\n</Layout>\n`;
      await ensureDir(path.dirname(dest));
      await fs.writeFile(dest, page, 'utf8');
      console.log(`Extras page: ${src} -> ${dest}`);
    } catch { /* skip if not present */ }
  }

  // Activities & Minigames
  const actDir = path.join(FROM, 'Extras', 'activities&minigames');
  let actEntries = [];
  try { actEntries = await fs.readdir(actDir, { withFileTypes: true }); } catch {}
  for (const ent of actEntries) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith('.html')) continue;
    const srcPath = path.join(actDir, ent.name);
    const raw = await fs.readFile(srcPath, 'utf8');
    const $ = cheerio.load(raw);
    const { title, html } = extract($);
    const slug = slugify(path.basename(ent.name, path.extname(ent.name)));
    const data = { title, tags: [] };
    const dest = path.join(ROOT, 'src', 'content', 'activities', `${slug}.mdx`);
    await writeMDX(dest, data, html);
    console.log(`Activity: ${ent.name} -> ${dest}`);
  }

  // Blog (pages without dates)
  const blogDir = path.join(FROM, 'Extras', 'Blog');
  let blogEntries = [];
  try { blogEntries = await fs.readdir(blogDir, { withFileTypes: true }); } catch {}
  for (const ent of blogEntries) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith('.html')) continue;
    const srcPath = path.join(blogDir, ent.name);
    const raw = await fs.readFile(srcPath, 'utf8');
    const $ = cheerio.load(raw);
    const { title, html } = extract($);
    const slug = slugify(path.basename(ent.name, path.extname(ent.name)));
    const data = { title, tags: [] }; // date omitted by design
    const dest = path.join(ROOT, 'src', 'content', 'posts', `${slug}.mdx`);
    await writeMDX(dest, data, html);
    console.log(`Blog page: ${ent.name} -> ${dest}`);
  }
}

async function run() {
  console.log('Migrating from:', FROM);
  await migrateTopLevel();
  await migrateGames();
  await migrateDrinks();
  await migrateExtras();
  console.log('Done. Review content under src/content and src/pages/extras.');
}

run().catch((e) => { console.error(e); process.exit(1); });
