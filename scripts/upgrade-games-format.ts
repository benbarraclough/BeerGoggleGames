/**
 * Bulk upgrade legacy game markdown files in src/content/games
 * so they use the MDX component structure shown in arrogance.mdx.
 *
 * WHAT IT DOES (per file):
 * 1. Parses frontmatter (kept as‑is; you can later prune fields manually).
 * 2. Skips any file that already contains <GameSection (assumed already migrated).
 * 3. Removes the first top-level title heading (# Title) if present (title comes from frontmatter).
 * 4. Strips legacy breadcrumb style numbered lists at the very top if they look like:
 *      1. [Home](/)
 *      2. [Categories](...)
 * 5. Splits content into sections by headings (## / ### / ####); most of your existing files
 *    appear to use ### for main subsections.
 * 6. Maps each section heading to an icon (as per arrogance.mdx); unknown headings get a fallback icon.
 * 7. Wraps each section body in:
 *      <GameSection title="Heading" icon="/BeerGoggleGames/images/XYZ.webp"> ... </GameSection>
 * 8. Prepends import statements + <GameHero .../> (using cover from frontmatter if present;
 *    if not, you can specify a DEFAULT_COVER).
 * 9. Appends <ShareButtons /> and <FeedbackCard /> blocks.
 * 10. Renames .md files to .mdx (configurable) so Astro processes the MDX components.
 *
 * SAFE PRACTICES:
 * - The script writes a backup copy next to each original file before overwriting (with .bak timestamp).
 * - Dry-run mode available (set DRY_RUN = true).
 *
 * USAGE:
 *   1. Ensure dependencies: pnpm add -D gray-matter
 *      (or npm i -D gray-matter / yarn add -D gray-matter)
 *   2. Run:  ts-node scripts/upgrade-games-format.ts
 *      (or compile to JS and run with node)
 *
 * AFTER RUN:
 *   - Review diffs (git diff) before committing.
 *   - Spot‑check a few upgraded games in dev: pnpm dev
 *
 * CUSTOMISE:
 *   - Adjust ICON_MAP below to refine heading → icon mapping.
 *   - Adjust IMAGE_PREFIX if your base path changes.
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const ROOT = path.join(process.cwd());
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

const DRY_RUN = false;                // Set true to preview without writing
const RENAME_MD_TO_MDX = true;        // Rename *.md → *.mdx
const DEFAULT_COVER = 'BGGBW.webp';   // Used if no cover in frontmatter (modify if desired)
const IMAGE_PREFIX = '/BeerGoggleGames/images'; // Matches arrogance.mdx usage

// Map normalized heading text → icon filename (without path)
const ICON_MAP: Record<string, string> = {
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

// Simple slug normalizer for heading keys
function normHeading(h: string) {
  return h
    .toLowerCase()
    .replace(/\(.*?\)/g, '')          // remove parenthetical notes (e.g., "Rules (Optional)")
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

interface Section {
  heading: string;
  body: string; // raw markdown for that section
  icon: string;
}

/**
 * Extract sections from markdown body.
 * We:
 *  - Remove leading breadcrumb list
 *  - Remove initial H1 (# Title) if present
 *  - Split on headings level 2-4 (##, ###, ####)
 */
function extractSections(raw: string): Section[] {
  let content = raw.trim();

  // Strip breadcrumb style numeric list at very top if found
  // Pattern: lines starting with "1. [Home]" "2. [Categories]" etc., consecutive
  content = content.replace(
    /^(?:\d+\.\s+\[[^\]]+\]\([^)]+\)\s*\n){2,5}/,
    ''
  );

  // Remove top-level H1 (title) line if present
  content = content.replace(/^#\s+.+?\n+/, '');

  // We'll capture all headings & their bodies
  // Regex explanation:
  // ^(#{2,4})\s+(.+?)$   -> a heading (level 2-4)
  // We then slice content between matches
  const headingRegex = /^(#{2,4})\s+(.+?)\s*$/gm;
  const matches: { index: number; level: number; text: string }[] = [];

  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(content)) !== null) {
    matches.push({
      index: m.index,
      level: m[1].length,
      text: m[2].trim()
    });
  }

  if (matches.length === 0) {
    // No headings found; treat whole content as a single generic section
    return [{
      heading: 'How to Play',
      body: content.trim(),
      icon: ICON_MAP['how to play'] || FALLBACK_ICON
    }];
  }

  const sections: Section[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const headingLine = content.slice(start, content.indexOf('\n', start) + 1);
    const bodyRaw = content.slice(content.indexOf('\n', start) + 1, end).trim();

    const headingText = matches[i].text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // remove trailing inline icon images if present
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

function buildMDX(front: Record<string, any>, sections: Section[]): string {
  // Ensure essential frontmatter fields remain
  const fm = { ...front };
  if (!fm.cover) fm.cover = DEFAULT_COVER;

  // We'll omit any prior imports in content; we control them
  const frontmatter = matter.stringify('', fm).trimEnd();

  const imports = [
    "import GameHero from '../../components/game/GameHero.astro';",
    "import GameSection from '../../components/game/GameSection.astro';",
    "import ShareButtons from '../../components/game/ShareButtons.astro';",
    "import FeedbackCard from '../../components/game/FeedbackCard.astro';"
  ].join('\n');

  // GameHero: we only output cover attribute if we have a cover path we can map to hero image.
  // Arrogance example uses /BeerGoggleGames/images/<slug>.webp; we keep generic by reusing fm.cover if it's already a relative path ending with .webp.
  const heroCover = typeof fm.cover === 'string'
    ? fm.cover.match(/\.webp|\.png|\.jpe?g|\.gif$/i)
      ? fm.cover
      : `${fm.cover}`
    : 'BGGBW.webp';

  const hero = `
<GameHero
  cover="${heroCover.startsWith('/') ? heroCover : `/BeerGoggleGames/images/${heroCover}`}"
  alt="${(fm.title || '').replace(/"/g, '&quot;')}"
/>
`.trim();

  const sectionBlocks = sections.map(sec => {
    // If body already contains HTML lists/paragraphs we keep as-is.
    // If plain text, we wrap paragraphs automatically (light heuristic).
    let body = sec.body.trim();

    // Heuristic: if body has no blank lines and no leading HTML/list markers, wrap in <p>
    const needsParagraphWrap =
      !/^</.test(body) &&
      !/^\s*[-*+]\s/m.test(body) &&
      !/^\s*\d+\.\s/m.test(body) &&
      !/\n\n/.test(body);

    if (needsParagraphWrap) {
      body = `<p>${body}</p>`;
    }

    return `
<GameSection title="${sec.heading.replace(/"/g, '&quot;')}" icon="${IMAGE_PREFIX}/${sec.icon}">
${body}
</GameSection>`.trim();
  }).join('\n\n');

  const tail = `
<ShareButtons title="${(fm.title || '').replace(/"/g, '&quot;')}" />

<FeedbackCard>
<p>If you think we've missed certain details out of the game or you have something to add, please feel free to contact us.</p>
</FeedbackCard>
`.trim();

  return `${frontmatter}

${imports}

${hero}

${sectionBlocks}

${tail}
`.replace(/\r\n/g, '\n');
}

async function processFile(filePath: string) {
  const orig = await fs.readFile(filePath, 'utf8');
  // Skip if already migrated
  if (/<GameSection\b/.test(orig)) {
    console.log(`SKIP (already migrated): ${path.basename(filePath)}`);
    return;
  }

  const parsed = matter(orig);
  const { data: front, content: body } = parsed;

  if (!front.title) {
    // Attempt to derive title from first H1 if missing
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
      await fs.unlink(filePath).catch(()=>{ /* ignore */ });
    }
  }

  console.log(`${DRY_RUN ? 'DRY' : 'OK '} → ${path.basename(targetPath)} (from ${path.basename(filePath)})`);
}

async function run() {
  let entries: string[] = [];
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
    console.log('This was a dry run. Set DRY_RUN = false to write changes.');
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
