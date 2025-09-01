/**
 * Bulk transform script (enhanced):
 * 1. Merge adjacent Special Edition + **Title** GameSection pairs into a single Special Edition section with <h4>Title</h4>.
 * 2. Remove inner paragraph from <FeedbackCard> blocks (empties them).
 * 3. Remove the standard intro paragraph inside Special Edition sections:
 *      <p>Add an extra layer of excitement to your game by playing:</p>
 *    Also (by default) matches small wording variants: using / with.
 *
 * Environment variables:
 *   DRY_RUN    (default "true")  -> set DRY_RUN=false to write files.
 *   CREATE_BAK (default "true")  -> set CREATE_BAK=false to skip backups (CI usually false).
 *   VERBOSE    (default "true")  -> set VERBOSE=false for minimal logging.
 *
 * Outputs per file:
 *   - merges
 *   - feedbackStripped
 *   - introsRemoved
 *
 * Safe to rerun: idempotent.
 */

const fs = require('fs/promises');
const path = require('path');

const DRY_RUN = process.env.DRY_RUN !== 'false';
const CREATE_BAK = process.env.CREATE_BAK !== 'false';
const VERBOSE = process.env.VERBOSE !== 'false';

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

console.log(`[config] DRY_RUN=${DRY_RUN} CREATE_BAK=${CREATE_BAK} VERBOSE=${VERBOSE}`);
console.log(`[config] Working directory: ${ROOT}`);
console.log(`[config] Target dir: ${GAMES_DIR}`);

/**
 * Core merge regex:
 * <GameSection title="Special Edition"...>...</GameSection>
 * <GameSection title="**Something**"...>...</GameSection>
 */
const specialMergeRegex = new RegExp(
  String.raw`<GameSection\s+title="Special Edition"([^>]*)>([\s\S]*?)</GameSection>\s*` +
  String.raw`<GameSection\s+title="(\*\*[^"]+\*\*)"([^>]*)>([\s\S]*?)</GameSection>`,
  'gi'
);

/**
 * FeedbackCard paragraph removal.
 */
const feedbackParagraphRegex = /<FeedbackCard>\s*<p>[\s\S]*?<\/p>\s*<\/FeedbackCard>/gi;

/**
 * Special Edition intro phrase removal.
 * Current flexible pattern matches:
 *   Add an extra layer of excitement to your game by playing:
 *   Add an extra layer of excitement to your game by using:
 *   Add an extra layer of excitement to your game by with:
 *
 * If you ONLY want the exact “playing:” variant, replace the pattern with:
 *   /<p>\s*Add an extra layer of excitement to your game by playing:\s*<\/p>\s*/gi
 */
const specialEditionIntroRegex =
  /<p>\s*Add an extra layer of excitement to your game by\s+(?:playing|using|with):\s*<\/p>\s*/gi;

/**
 * Loose pre-scan to count candidate pairs before strict merge.
 */
const preScanPairRegex =
  /<GameSection\s+title="Special Edition"[\s\S]*?<\/GameSection>\s*<GameSection\s+title="\*\*[^"]+\*\*"[\s\S]*?<\/GameSection>/gi;

async function collectFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`[error] Could not read directory ${dir}:`, e.message);
    return out;
  }
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

function mergeSpecialSections(content, debugInfo) {
  let changed = false;
  let mergeCount = 0;

  const replaced = content.replace(specialMergeRegex, (match, attrs1, inner1, rawAsteriskTitle, attrs2, inner2) => {
    changed = true;
    mergeCount++;

    if (mergeCount === 1 && debugInfo) {
      debugInfo.firstRawMatch = match.slice(0, 400);
    }

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

function removeSpecialEditionIntro(content) {
  let changed = false;
  let removedCount = 0;
  const replaced = content.replace(specialEditionIntroRegex, () => {
    changed = true;
    removedCount++;
    return '';
  });
  return { replaced, changed, removedCount };
}

async function processFile(file) {
  const orig = await fs.readFile(file, 'utf8');
  const rel = path.relative(GAMES_DIR, file);

  const prePairs = (orig.match(preScanPairRegex) || []).length;

  const debugInfo = { prePairs };
  let current = orig;

  // Merge sections first (so the intro may become adjacent to the new h4).
  const { replaced: afterMerge, changed: merged, mergeCount } = mergeSpecialSections(current, debugInfo);
  current = afterMerge;

  // Remove intro phrase paragraphs inside Special Edition sections (after merging).
  const { replaced: afterIntro, changed: introChanged, removedCount: introsRemoved } = removeSpecialEditionIntro(current);
  current = afterIntro;

  // Strip FeedbackCard paragraph (after other changes).
  const { replaced: afterFeedback, changed: feedbackChanged, stripCount } = stripFeedbackParagraph(current);
  current = afterFeedback;

  const fileChanged = merged || introChanged || feedbackChanged;

  if (VERBOSE) {
    if (!fileChanged) {
      console.log(`UNCHANGED ${rel} (prePairs=${prePairs})`);
    } else {
      console.log(`${DRY_RUN ? 'WOULD UPDATE' : 'UPDATED'} ${rel} [prePairs=${prePairs}] [merges=${mergeCount}] [introsRemoved=${introsRemoved}] [feedbackStripped=${stripCount}]`);
      if (DRY_RUN && debugInfo.firstRawMatch) {
        console.log(`  First raw match snippet:\n-----\n${debugInfo.firstRawMatch}\n-----`);
      }
    }
  }

  if (!fileChanged) {
    return {
      changed: false,
      mergeCount,
      introsRemoved,
      stripCount,
      prePairs
    };
  }

  if (DRY_RUN) {
    return {
      changed: false,
      mergeCount,
      introsRemoved,
      stripCount,
      prePairs
    };
  }

  if (CREATE_BAK) {
    const bak = `${file}.bak-${Date.now()}`;
    await fs.writeFile(bak, orig, 'utf8');
  }
  await fs.writeFile(file, current, 'utf8');

  return {
    changed: true,
    mergeCount,
    introsRemoved,
    stripCount,
    prePairs
  };
}

async function run() {
  console.log('Scanning files...');
  const files = await collectFiles(GAMES_DIR);
  console.log(`Found ${files.length} game file(s).`);

  let totalMerges = 0;
  let totalStrips = 0;
  let totalChanged = 0;
  let totalPrePairs = 0;
  let totalIntroRemoved = 0;

  for (const f of files) {
    const res = await processFile(f);
    totalMerges += res.mergeCount;
    totalStrips += res.stripCount;
    totalPrePairs += res.prePairs;
    totalIntroRemoved += res.introsRemoved;
    if (res.changed) totalChanged++;
  }

  console.log('\nSummary:');
  console.log('  Files processed      :', files.length);
  console.log('  Files changed        :', totalChanged);
  console.log('  Pre-scan pairs       :', totalPrePairs);
  console.log('  Special merges       :', totalMerges);
  console.log('  Intro paragraphs rem.:', totalIntroRemoved);
  console.log('  Feedback stripped    :', totalStrips);
  console.log('Mode:', DRY_RUN ? 'DRY RUN' : 'APPLIED');

  if (totalPrePairs > 0 && totalMerges === 0) {
    console.log('\n[WARN] Candidate pairs detected but 0 merges executed. Provide a raw snippet for regex refinement.');
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
