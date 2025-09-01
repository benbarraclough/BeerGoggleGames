/**
 * Bulk transform script:
 * 1. Merge adjacent <GameSection title="Special Edition"> ... </GameSection>
 *    + a following <GameSection title="**Something**"> into a single section
 *    inserting <h4>Something</h4>.
 * 2. Remove inner <p> ... </p> content from <FeedbackCard> blocks (empties them).
 *
 * Environment variables:
 *   DRY_RUN   (default: "true")  -> set to "false" to actually write.
 *   CREATE_BAK (default: "true") -> set to "false" to skip .bak creation.
 *   VERBOSE    (default: "true") -> set to "false" for quieter logs.
 *
 * Usage examples:
 *   DRY_RUN=true node scripts/merge-special-editions.cjs   # dry
 *   DRY_RUN=false node scripts/merge-special-editions.cjs  # apply
 */

const fs = require('fs/promises');
const path = require('path');

const DRY_RUN = process.env.DRY_RUN !== 'false';       // default true
const CREATE_BAK = process.env.CREATE_BAK !== 'false'; // default true
const VERBOSE = process.env.VERBOSE !== 'false';       // default true

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

if (VERBOSE) {
  console.log(`[config] DRY_RUN=${DRY_RUN} CREATE_BAK=${CREATE_BAK} VERBOSE=${VERBOSE}`);
}

/**
 * Regex to find pattern:
 * <GameSection title="Special Edition"...>...</GameSection>
 * (optional whitespace/newlines)
 * <GameSection title="**Something**"...>...</GameSection>
 *
 * We keep attrs of both (only need attrs of first) and merge content.
 */
const specialMergeRegex = new RegExp(
  String.raw`<GameSection\s+title="Special Edition"([^>]*)>([\s\S]*?)</GameSection>\s*` +
  String.raw`<GameSection\s+title="(\*\*[^"]+\*\*)"([^>]*)>([\s\S]*?)</GameSection>`,
  'gi'
);

// Remove paragraph inside FeedbackCard
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
  let mergeCount = 0;

  const replaced = content.replace(specialMergeRegex, (match, attrs1, inner1, rawAsteriskTitle, attrs2, inner2) => {
    changed = true;
    mergeCount++;

    const heading = rawAsteriskTitle
      .replace(/^\*\*\s*/, '')
      .replace(/\s*\*\*$/, '')
      .trim();

    const cleanedInner1 = inner1.trimEnd();
    const cleanedInner2 = inner2.trim();
    const spacer = /\n\s*$/.test(cleanedInner1) ? '' : '\n\n';

    return `<GameSection title="Special Edition"${attrs1}>
${cleanedInner1}${spacer}<h4>${heading}</h4>
${cleanedInner2.startsWith('\n') ? cleanedInner2 : '\n' + cleanedInner2}
</GameSection>`;
  });

  return { replaced, changed, mergeCount };
}

function stripFeedbackParagraph(content) {
  let changed = false;
  let stripCount = 0;
  const replaced = content.replace(feedbackParagraphRegex, () => {
    changed = true;
    stripCount++;
    return `<FeedbackCard>\n</FeedbackCard>`;
  });
  return { replaced, changed, stripCount };
}

async function processFile(file) {
  const orig = await fs.readFile(file, 'utf8');
  let current = orig;

  const { replaced: afterMerge, changed: merged, mergeCount } = mergeSpecialSections(current);
  current = afterMerge;

  const { replaced: afterFeedback, changed: feedbackChanged, stripCount } = stripFeedbackParagraph(current);
  current = afterFeedback;

  if (!merged && !feedbackChanged) {
    if (VERBOSE) console.log('UNCHANGED', path.relative(GAMES_DIR, file));
    return { changed: false, mergeCount: 0, stripCount: 0 };
  }

  if (DRY_RUN) {
    console.log('WOULD UPDATE', path.relative(GAMES_DIR, file),
      `[merges=${mergeCount}] [feedbackStripped=${stripCount}]`);
    return { changed: false, mergeCount, stripCount };
  }

  if (CREATE_BAK) {
    const bak = `${file}.bak-${Date.now()}`;
    await fs.writeFile(bak, orig, 'utf8');
  }

  await fs.writeFile(file, current, 'utf8');
  console.log('UPDATED', path.relative(GAMES_DIR, file),
    `[merges=${mergeCount}] [feedbackStripped=${stripCount}]`);

  return { changed: true, mergeCount, stripCount };
}

async function run() {
  console.log('Scanning game content...');
  const files = await collectFiles(GAMES_DIR);
  console.log(`Found ${files.length} candidate file(s).`);

  let totalMerges = 0;
  let totalStrips = 0;
  let changedFiles = 0;

  for (const f of files) {
    try {
      const res = await processFile(f);
      totalMerges += res.mergeCount;
      totalStrips += res.stripCount;
      if (res.changed) changedFiles++;
    } catch (e) {
      console.error('ERROR', f, e.message);
    }
  }

  console.log('\nSummary:');
  console.log('  Files processed:', files.length);
  console.log('  Files changed:  ', changedFiles);
  console.log('  Special merges: ', totalMerges);
  console.log('  Feedback strips:', totalStrips);
  console.log('Mode:', DRY_RUN ? 'DRY RUN' : 'APPLIED');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
