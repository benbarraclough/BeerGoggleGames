/**
 * Auto-generate legacy redirect HTML files.
 *
 * Produces files under: public/legacy/<original/relative/path>.html
 *
 * Heuristics:
 *  - Detects collection by legacy path fragment, else tries matching a known slug across collections.
 *  - Skips category/index/utility pages.
 *  - Logs unresolved paths for manual follow-up.
 *
 * Run:
 *   node scripts/generate-auto-redirects.js
 *
 * (Add to prebuild or run ad-hoc.)
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const LEGACY_DIR = path.join(ROOT, 'legacy');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const OUT_ROOT = path.join(ROOT, 'public', 'legacy');

// Manual overrides (legacy relative path -> new absolute URL path)
const MANUAL = {
  'Extras/glossary.html': '/posts/drinking-glossary/'
};

// Filenames / paths to skip entirely
const SKIP_BASENAMES = new Set([
  '404.html','index.html','sitemap.html','about.html','contact.html',
  'drinks.html','extras.html','GameCategories.html','AllGames.html',
  '1v1Games.html','CardGames.html','CoinGames.html','CupGames.html',
  'DiceGames.html','FreeForAllGames.html','MiscGames.html','OutdoorGames.html',
  'PairGames.html','PongGames.html','TeamGames.html','VocalGames.html',
  'blog.html','activities&minigames.html','DrinkSearchTool.html'
]);

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function walk(dir) {
  const out = [];
  if(!fs.existsSync(dir)) return out;
  for(const e of fs.readdirSync(dir)) {
    const full = path.join(dir,e);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function loadSlugs() {
  const collections = ['games','cocktails','shots','activities','posts'];
  const index = {};
  collections.forEach(c => {
    const dir = path.join(CONTENT_DIR, c);
    if(!fs.existsSync(dir)) return;
    index[c] = new Set(
      fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/,''))
    );
  });
  return index;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.html$/,'')
    .replace(/&/g,'-and-')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
}

function buildRedirectHtml(target) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${target}"><title>Redirecting...</title><script>location.replace(${JSON.stringify(target)});</script></head><body><p>Redirecting to <a href="${target}">${target}</a></p></body></html>`;
}

function guessCollection(relPath, slug, slugsIndex) {
  const lower = relPath.toLowerCase();
  if (lower.includes('cocktailrecipes')) return slugsIndex.cocktails?.has(slug) ? 'cocktails' : null;
  if (lower.includes('shotrecipes')) return slugsIndex.shots?.has(slug) ? 'shots' : null;
  if (lower.includes('activities&minigames')) return slugsIndex.activities?.has(slug) ? 'activities' : null;
  if (lower.includes('blog')) return slugsIndex.posts?.has(slug) ? 'posts' : null;
  if (lower.includes('gamecategories')) return slugsIndex.games?.has(slug) ? 'games' : null;

  // Fallback: find first collection containing slug
  for (const [c,set] of Object.entries(slugsIndex)) {
    if (set.has(slug)) return c;
  }
  return null;
}

function main() {
  const slugsIndex = loadSlugs();
  const legacyFiles = walk(LEGACY_DIR)
    .filter(f => f.endsWith('.html'))
    .filter(f => !f.includes(path.sep + '404.html'));

  const unresolved = [];
  const written = [];
  const overridden = [];

  legacyFiles.forEach(file => {
    const rel = path.relative(LEGACY_DIR, file).replace(/\\/g,'/');
    const base = path.basename(rel);
    if (SKIP_BASENAMES.has(base)) return;

    if (MANUAL[rel]) {
      const target = MANUAL[rel];
      const outFile = path.join(OUT_ROOT, rel);
      ensureDir(path.dirname(outFile));
      fs.writeFileSync(outFile, buildRedirectHtml(target), 'utf8');
      overridden.push({ rel, target, reason: 'manual' });
      return;
    }

    const slug = slugify(base);
    if (!slug) return;

    const collection = guessCollection(rel, slug, slugsIndex);
    if (!collection) {
      unresolved.push(rel);
      return;
    }

    const target = `/${collection}/${slug}/`;
    const outFile = path.join(OUT_ROOT, rel);
    ensureDir(path.dirname(outFile));
    fs.writeFileSync(outFile, buildRedirectHtml(target), 'utf8');
    written.push({ rel, target });
  });

  console.log(`Redirects generated: ${written.length}`);
  console.log(`Manual overrides: ${overridden.length}`);
  if (unresolved.length) {
    console.log('Unresolved legacy files (add to MANUAL or adjust rules):');
    unresolved.forEach(r => console.log('  ' + r));
  } else {
    console.log('All legacy files mapped.');
  }
}

main();
