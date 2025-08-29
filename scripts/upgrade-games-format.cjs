/**
 * Bulk upgrade legacy game markdown files to the MDX component layout.
 * JavaScript (CommonJS) version for GitHub Actions / Node.
 *
 * See original TypeScript comments for detailed behavior.
 */

const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

const DRY_RUN = false;               // Set true if you edit & re-run for a safe preview (no writes)
const RENAME_MD_TO_MDX = true;
const DEFAULT_COVER = 'BGGBW.webp';
const IMAGE_PREFIX = '/BeerGoggleGames/images';

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

function extractSections(raw) {
  let content = raw.trim();

  // Breadcrumb numeric list at very top
  content = content.replace(/^(?:\d+\.\s+\[[^\]]+\]\([^)]+\)\s*\n){2,5}/, '');

  // Remove top-level H1
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
  if (!fm.cover) fm.cover = DEFAULT_COVER;

  const frontmatter = matter.stringify('', fm).trimEnd();

  const imports = [
    "import GameHero from '../../components/game/GameHero.astro';",
    "import GameSection from '../../components/game/GameSection.astro';",
    "import ShareButtons from '../../components/game/ShareButtons.astro';",
    "import FeedbackCard from '../../components/game/FeedbackCard.astro';"
  ].join('\n');

  const title = (fm.title || '').replace(/"/g, '&quot;');

  const heroCover = typeof fm.cover === 'string'
    ? fm.cover.match(/\.webp|\.png|\.jpe?g|\.gif$/i)
      ? fm.cover
      : `${fm.cover}`
    : 'BGGBW.webp';

  const hero = `
<GameHero
  cover="${heroCover.startsWith('/') ? heroCover : `/BeerGoggleGames/images/${heroCover}`}"
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
<GameSection title="${sec.heading.replace(/"/g, '&quot;')}" icon="${IMAGE_PREFIX}/${sec.icon}">
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

async function processFile(filePath) {
  const orig = await fs.readFile(filePath, 'utf8');
  if (/<GameSection\b/.test(orig)) {
    console.log(`SKIP (already migrated): ${path.basename(filePath)}`);
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${filePath}.bak-${timestamp}`;
  if (!DRY_RUN) {
    await fs.writeFile(backupName, orig, 'utf8');
  }

  let targetPath = filePath;
  if (RENAME_MD_TO_MDX && filePath.endsWith('.md')) {
    targetPath = filePath.replace(/\.md$/, '.mdx');
  }

  if (!DRY_RUN) {
    await fs.writeFile(targetPath, mdx, 'utf8');
    if (targetPath !== filePath) {
      await fs.unlink(filePath).catch(()=>{});
    }
  }

  console.log(`${DRY_RUN ? 'DRY' : 'OK '} → ${path.basename(targetPath)} (from ${path.basename(filePath)})`);
}

async function run() {
  let entries = [];
  try {
    entries = await fs.readdir(GAMES_DIR);
  } catch (e) {
    console.error('Cannot read games directory:', GAMES_DIR, e);
    process.exit(1);
  }

  const gameFiles = entries
    .filter(f => /\.(md|mdx)$/i.test(f))
    .map(f => path.join(GAMES_DIR, f));

  if (gameFiles.length === 0) {
    console.log('No markdown game files found.');
    return;
  }

  console.log(`Found ${gameFiles.length} game files.`);
  for (const fp of gameFiles) {
    try {
      await processFile(fp);
    } catch (e) {
      console.error('ERROR processing', fp, e);
    }
  }

  console.log('Done.');
  if (DRY_RUN) {
    console.log('Dry run only. Set DRY_RUN = false to write changes.');
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
