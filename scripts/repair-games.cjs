#!/usr/bin/env node
/**
 * repair-games.cjs
 *
 * (Assumed purpose: regenerate or repair game content files.)
 * Updated to use the new root-relative image path (/images/...) instead of the old
 * /BeerGoggleGames/images/ prefix that was specific to the previous GitHub Pages base.
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(process.cwd(), 'src/content/games');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(md|mdx)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function slugFromFilename(file) {
  return path.basename(file).replace(/\.(md|mdx)$/i, '');
}

function run() {
  const files = walk(GAMES_DIR);
  console.log(`Scanning ${files.length} game file(s)...`);
  let changed = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const slug = slugFromFilename(file);

    // This logic previously injected /BeerGoggleGames/images/<slug>.webp
    // Update to new root-relative path:
    const newImg = `/images/${slug}.webp`;

    // Example heuristic: ensure a cover frontmatter exists or update existing GameHero cover
    let updated = content;

    // Replace GameHero cover attribute old prefix if present
    updated = updated.replace(
      /cover\s*=\s*["']\/BeerGoggleGames\/images\/([^"']+)["']/g,
      (m, fname) => `cover="/images/${fname}"`
    );

    // Fallback: if a <GameHero ...> tag has a mismatched cover, optionally fix
    updated = updated.replace(
      /<GameHero([^>]*?)cover=["']\/BeerGoggleGames\/images\/([^"']+)["']/g,
      (m, pre, fname) => `<GameHero${pre}cover="/images/${fname}"`
    );

    if (updated !== content) {
      fs.writeFileSync(file, updated, 'utf8');
      changed++;
      console.log(`Updated image path in: ${path.relative(process.cwd(), file)}`);
    }
  }

  console.log(`Done. Changed ${changed} file(s).`);
}

if (require.main === module) {
  run();
}
