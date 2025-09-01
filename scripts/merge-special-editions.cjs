/**
 * Bulk transform:
 * 1. Merge "Special Edition" section followed immediately by a section whose title is wrapped in **...**.
 * 2. Strip the single <p> inside <FeedbackCard> blocks, leaving them empty.
 *
 * DRY_RUN=true -> shows intended changes without writing.
 *
 * Safety:
 * - Creates timestamped .bak backups of any modified file (can disable via CREATE_BAK).
 * - Only processes .md / .mdx under src/content/games.
 */

const fs = require('fs/promises');
const path = require('path');

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

const DRY_RUN = true;        // Set to false to apply changes
const CREATE_BAK = true;     // Set to false to skip backups
const VERBOSE = true;

/**
 * Regex approach:
 * We look for a Special Edition GameSection followed by another GameSection
 * whose title="**...**".
 *
 * Capture groups:
 *  1: attributes of first (for completeness if needed)
 *  2: inner HTML/MD of the Special Edition section
 *  3: raw asterisk title (e.g. **Bonus Rules**)
 *  4: inner HTML/MD of the second (bonus) section
 *
 * We use a tempered pattern for the second title to avoid greedy issues.
 */
const specialMergeRegex = new RegExp(
  String.raw`<GameSection\s+title="Special Edition"([^>]*)>([\s\S]*?)</GameSection>\s*` +
  String.raw`<GameSection\s+title="(\*\*[^"]+\*\*)"[^>]*>([\s\S]*?)</GameSection>`,
  'gi'
);

// FeedbackCard paragraph removal (single paragraph variant)
const feedbackParagraphRegex = /<FeedbackCard>\s*<p>[\s\S]*?<\/p>\s*<\/FeedbackCard>/gi;

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

function mergeSpecialSections(content) {
  let changed = false;

  const replaced = content.replace(specialMergeRegex, (match, attrs, inner1, rawAsteriskTitle, inner2) => {
    changed = true;

    // Clean up the heading text by stripping ** and surrounding whitespace
    const heading = rawAsteriskTitle.replace(/^\*\*\s*/, '').replace(/\s*\*\*$/, '').trim();

    // Normalize inner blocks (avoid extra blank lines stacking)
    const cleanedInner1 = inner1.trimEnd();
    const cleanedInner2 = inner2.trim();

    // Ensure there is at least one blank line before the new <h4> if inner1 has content
    const spacer = /\n\s*$/.test(cleanedInner1) ? '' : '\n\n';

    // Build merged section
    const merged =
`<GameSection title="Special Edition"${attrs}>
${cleanedInner1}${spacer}<h4>${heading}</h4>
${cleanedInner2.startsWith('\n') ? cleanedInner2 : '\n' + cleanedInner2}
</GameSection>`;

    return merged;
  });

  return { replaced, changed };
}

function stripFeedbackParagraph(content) {
  let changed = false;
  const replaced = content.replace(feedbackParagraphRegex, () => {
    changed = true;
    return `<FeedbackCard>\n</FeedbackCard>`;
  });
  return { replaced, changed };
}

async function processFile(file) {
  const orig = await fs.readFile(file, 'utf8');
  let current = orig;

  const { replaced: afterMerge, changed: merged } = mergeSpecialSections(current);
  current = afterMerge;

  const { replaced: afterFeedback, changed: feedbackChanged } = stripFeedbackParagraph(current);
  current = afterFeedback;

  if (!merged && !feedbackChanged) {
    if (VERBOSE) console.log('UNCHANGED', path.relative(GAMES_DIR, file));
    return { changed: false };
  }

  if (DRY_RUN) {
    console.log('WOULD UPDATE', path.relative(GAMES_DIR, file), [
      merged && '[merged sections]',
      feedbackChanged && '[cleared feedback paragraph]'
    ].filter(Boolean).join(' '));
    return { changed: false, dry: true };
  }

  if (CREATE_BAK) {
    const bak = `${file}.bak-${Date.now()}`;
    await fs.writeFile(bak, orig, 'utf8');
  }

  await fs.writeFile(file, current, 'utf8');
  console.log('UPDATED', path.relative(GAMES_DIR, file), [
    merged && '[merged sections]',
    feedbackChanged && '[cleared feedback paragraph]'
  ].filter(Boolean).join(' '));
  return { changed: true };
}

async function run() {
  console.log('Scanning for game content files...');
  const files = await collectFiles(GAMES_DIR);
  console.log(`Found ${files.length} candidate file(s).\n`);

  let changed = 0;
  let dryHits = 0;

  for (const f of files) {
    try {
      const res = await processFile(f);
      if (res.changed) changed++;
      if (res.dry) dryHits++;
    } catch (e) {
      console.error('ERROR processing', f, e);
    }
  }

  console.log('\nSummary:');
  console.log('  Files total:     ', files.length);
  console.log('  Files changed:   ', changed);
  if (DRY_RUN) console.log('  Files (would):   ', dryHits);
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no writes)' : 'APPLIED');
  console.log('Done.');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
