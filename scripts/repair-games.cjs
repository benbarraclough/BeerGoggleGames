/**
 * Repair & normalize game MDX files after initial migration.
 *
 * Actions:
 *  - Rename frontmatter players -> format (if needed)
 *  - Remove duplicate GameSection blocks titled "Share This Page" or "Feedback"
 *  - Normalize cover: if missing or BGGBW.webp => <fileSlug>.webp
 *  - Normalize <GameHero cover="...BGGBW.webp"> same logic
 *  - Optionally FORCE rewrite even if already clean
 *
 * Safe:
 *  - Writes .bak timestamped backups (toggle via CREATE_BAK)
 *
 * Run (GitHub Action or locally):
 *    node scripts/repair-games.cjs
 */
const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

const DRY_RUN = false;
const FORCE = true;          // Set true for first pass, then false later if desired
const CREATE_BAK = true;

const SHARE_FEEDBACK_SECTION_REGEX = /<GameSection\s+title="(?:Share This Page|Feedback)"[\s\S]*?<\/GameSection>\n*/gi;

async function collectFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await collectFiles(full));
    } else if (/\.(md|mdx)$/i.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function fileSlugFromPath(fp) {
  return path.basename(fp).replace(/\.(md|mdx)$/i, '');
}

function needsRepair(raw, front, fp) {
  if (FORCE) return true;
  if (front.players && !front.format) return true;
  if (!front.cover || /^bggbw\.webp$/i.test(front.cover)) return true;
  if (/BGGBW\.webp/.test(raw)) return true;
  if (/<GameSection\s+title="Share This Page"/.test(raw) || /<GameSection\s+title="Feedback"/.test(raw)) return true;
  return false;
}

function transformContent(raw, front, fp) {
  // Remove duplicate Share/Feedback GameSection blocks
  let updated = raw.replace(SHARE_FEEDBACK_SECTION_REGEX, '');

  // Replace hero cover BGGBW
  const slug = fileSlugFromPath(fp);
  const newImg = `/BeerGoggleGames/images/${slug}.webp`;
  updated = updated.replace(
    /<GameHero([\s\S]*?)cover="[^"]*BGGBW\.webp"([\s\S]*?)\/>/,
    `<GameHero$1cover="${newImg}"$2/>`
  );

  return updated;
}

async function processFile(fp, stats) {
  const orig = await fs.readFile(fp, 'utf8');
  let fm;
  try {
    fm = matter(orig);
  } catch (e) {
    console.warn('SKIP (frontmatter parse error):', path.relative(GAMES_DIR, fp));
    stats.skipped++;
    return;
  }

  const front = { ...fm.data };
  const slug = fileSlugFromPath(fp);

  const before = JSON.stringify(front);

  // players -> format
  if (front.players && !front.format) {
    front.format = front.players;
    delete front.players;
  }

  // cover normalization
  if (!front.cover || /^bggbw\.webp$/i.test(front.cover)) {
    front.cover = `${slug}.webp`;
  } else if (!front.cover.endsWith('.webp') && !front.cover.startsWith('/') && !/\.(png|jpe?g|gif|webp)$/i.test(front.cover)) {
    // leave unusual covers alone
  }

  if (!needsRepair(orig, front, fp)) {
    stats.skipped++;
    return;
  }

  // Body transform
  let body = fm.content;
  body = transformContent(body, front, fp);

  // Make sure we didn't accidentally duplicate ShareButtons or FeedbackCard (leave as-is)
  // (No extra action needed; we only removed GameSection duplicates.)

  const rebuilt = matter.stringify(body.trim() + '\n', front);
  if (DRY_RUN) {
    stats.dry++;
    console.log('DRY  ', path.relative(GAMES_DIR, fp));
    return;
  }

  if (CREATE_BAK) {
    await fs.writeFile(fp + '.bak-' + Date.now(), orig, 'utf8');
  }
  await fs.writeFile(fp.replace(/\.md$/, '.mdx'), rebuilt, 'utf8');

  if (/\.md$/i.test(fp)) {
    // remove original .md if renamed
    if (fp !== fp.replace(/\.md$/, '.mdx')) {
      await fs.unlink(fp).catch(()=>{});
    }
  }

  stats.changed++;
  console.log('FIX  ', path.relative(GAMES_DIR, fp));
}

async function run() {
  const files = await collectFiles(GAMES_DIR);
  const stats = { total: files.length, changed: 0, skipped: 0, dry: 0 };
  console.log(`Found ${files.length} game files to scan.\n`);
  for (const f of files) {
    try {
      await processFile(f, stats);
    } catch (e) {
      console.error('ERROR', f, e);
    }
  }
  console.log('\nSummary:');
  console.log('  Total:   ', stats.total);
  console.log('  Changed: ', stats.changed);
  console.log('  Skipped: ', stats.skipped);
  if (DRY_RUN) console.log('  Dry only:', stats.dry);
  console.log('Done.');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
