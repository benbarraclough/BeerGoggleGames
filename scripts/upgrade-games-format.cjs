/**
 * Recursive bulk upgrade of game markdown (*.md / *.mdx) files so they match
 * the component layout used by arrogance.mdx.
 *
 * Enhancements over prior version:
 *  - Recurses through all nested directories under src/content/games.
 *  - FORCE flag to re-wrap even if <GameSection> already present.
 *  - Logs detailed per-file status & final summary.
 *  - Option to auto-derive hero cover path from title slug if missing.
 *  - Keeps original wording; only restructures.
 */

const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

const DRY_RUN = false;            // true → do not write, just report
const FORCE = false;              // true → rebuild even if file already has <GameSection>
const RENAME_MD_TO_MDX = true;
const CREATE_BAK = true;          // set false once confident
const DEFAULT_COVER = 'BGGBW.webp';
const IMAGE_PREFIX = '/BeerGoggleGames/images';
const AUTO_HERO_FROM_TITLE = true; // derive e.g. "Arrogance" → "arrogance.webp" if cover missing

const ICON_MAP = {
  'equipment': 'liquor.webp',
  'setup': 'settings.webp',
  'aim': 'target.webp',
  'aim of the game': 'target.webp',
  'goal': 'target.webp',
  'objective': 'target.webp',
  'how to play': 'question.webp',
  'gameplay': 'question.webp',
  'rules': 'rules.webp',
  'special edition': 'special.webp',
  'special editions': 'special.webp',
  'variants': 'special.webp',
  'variant': 'special.webp',
  'variation': 'special.webp',
  'notes': 'special.webp',
  'tips': 'special.webp'
};
const FALLBACK_ICON = 'question.webp';

function normHeading(h) {
  return h
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function slugifyTitle(t) {
  return (t || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g,'')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'') || 'game';
}

function extractSections(raw) {
  let content = raw.trim();
  content = content.replace(/^(?:\d+\.\s+\[[^\]]+\]\([^)]+\)\s*\n){2,5}/, '');
  content = content.replace(/^#\s+.+?\n+/, '');

  const headingRegex = /^(#{2,4})\s+(.+?)\s*$/gm;
  const matches = [];
  let m;
  while ((m = headingRegex.exec(content)) !== null) {
    matches.push({ index: m.index, level: m[1].length, text: m[2].trim() });
  }

  if (matches.length === 0) {
    return [{
      heading: 'How to Play',
      body: content.trim(),
      icon: ICON_MAP['how to play'] || FALLBACK_ICON
    }];
  }

  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const bodyRaw = content.slice(content.indexOf('\n', start) + 1, end).trim();

    const headingText = matches[i].text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/<img[^>]*>$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const key = normHeading(headingText);
    const icon = ICON_MAP[key] || FALLBACK_ICON;

    sections.push({
      heading: headingText,
      body: bodyRaw,
      icon
    });
  }
  return sections;
}

function buildMDX(front, sections) {
  const fm = { ...front };
  if (!fm.cover) {
    if (AUTO_HERO_FROM_TITLE && fm.title) {
      const slug = slugifyTitle(fm.title);
      fm.cover = `${slug}.webp`; // just filename; hero builder adds path
    } else {
      fm.cover = DEFAULT_COVER;
    }
  }

  const title = (fm.title || '').replace(/"/g,'&quot;');
  const frontmatter = matter.stringify('', fm).trimEnd();

  const imports = [
    "import GameHero from '../../components/game/GameHero.astro';",
    "import GameSection from '../../components/game/GameSection.astro';",
    "import ShareButtons from '../../components/game/ShareButtons.astro';",
    "import FeedbackCard from '../../components/game/FeedbackCard.astro';"
  ].join('\n');

  let coverVal = fm.cover;
  // If user gave just "arrogance.webp" add images path
  if (!coverVal.startsWith('/')) {
    coverVal = `${IMAGE_PREFIX}/${coverVal}`;
  }

  const hero = `
<GameHero
  cover="${coverVal}"
  alt="${title}"
/>`.trim();

  const sectionBlocks = sections.map(sec => {
    let body = sec.body.trim();
    const needsParagraphWrap =
      !/^</.test(body) &&
      !/^\s*[-*+]\s/m.test(body) &&
      !/^\s*\d+\.\s/m.test(body) &&
      !/\n\n/.test(body);
    if (needsParagraphWrap) body = `<p>${body}</p>`;
    return `
<GameSection title="${sec.heading.replace(/"/g,'&quot;')}" icon="${IMAGE_PREFIX}/${sec.icon}">
${body}
</GameSection>`.trim();
  }).join('\n\n');

  const tail = `
<ShareButtons title="${title}" />

<FeedbackCard>
<p>If you think we've missed certain details out of the game or you have something to add, please feel free to contact us.</p>
</FeedbackCard>`.trim();

  return `${frontmatter}

${imports}

${hero}

${sectionBlocks}

${tail}
`.replace(/\r\n/g, '\n');
}

async function collectFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip hidden/system
      if (e.name.startsWith('.')) continue;
      out.push(...await collectFiles(full));
    } else if (/\.(md|mdx)$/i.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

async function processFile(filePath, stats) {
  const rel = path.relative(GAMES_DIR, filePath);
  const orig = await fs.readFile(filePath, 'utf8');

  const alreadyHasSections = /<GameSection\b/.test(orig);
  if (alreadyHasSections && !FORCE) {
    stats.skippedAlready++;
    console.log(`SKIP (already structured): ${rel}`);
    return;
  }

  const parsed = matter(orig);
  const front = parsed.data || {};
  let body = parsed.content || '';

  if (!front.title) {
    const m = body.match(/^#\s+(.+)$/m);
    if (m) front.title = m[1].trim();
  }

  const sections = extractSections(body);
  const mdx = buildMDX(front, sections);

  if (DRY_RUN) {
    stats.dry++;
    console.log(`DRY → ${rel}`);
    return;
  }

  if (CREATE_BAK) {
    const backupName = `${filePath}.bak-${Date.now()}`;
    await fs.writeFile(backupName, orig, 'utf8');
  }

  let targetPath = filePath;
  if (RENAME_MD_TO_MDX && filePath.endsWith('.md')) {
    targetPath = filePath.replace(/\.md$/, '.mdx');
  }

  await fs.writeFile(targetPath, mdx, 'utf8');
  if (targetPath !== filePath) {
    // remove original .md if renamed
    await fs.unlink(filePath).catch(()=>{});
  }

  stats.converted++;
  console.log(`OK  → ${rel}${targetPath !== filePath ? ' (renamed .mdx)' : ''}`);
}

async function run() {
  const stats = {
    total: 0,
    converted: 0,
    skippedAlready: 0,
    dry: 0
  };
  console.log('Scanning game content recursively...');
  const files = await collectFiles(GAMES_DIR);
  stats.total = files.length;
  if (!files.length) {
    console.log('No markdown / mdx files found under games.');
    return;
  }
  console.log(`Found ${files.length} candidate files.\n`);
  for (const f of files) {
    try {
      await processFile(f, stats);
    } catch (e) {
      console.error('ERROR processing', path.relative(GAMES_DIR, f), e);
    }
  }
  console.log('\nSummary:');
  console.log(`  Total files:          ${stats.total}`);
  console.log(`  Converted/Rebuilt:    ${stats.converted}`);
  console.log(`  Skipped (already had):${stats.skippedAlready}`);
  if (DRY_RUN) console.log(`  Dry-run only:         ${stats.dry}`);
  console.log('\nDONE.');
  if (DRY_RUN) console.log('Re-run with DRY_RUN=false to apply changes.');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
