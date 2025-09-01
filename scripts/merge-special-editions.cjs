/**
 * Bulk transform:
 * 1. Merge adjacent Special Edition + **Title** GameSection pairs into one section with <h4>Title</h4>.
 * 2. Remove any Special Edition intro paragraph that starts with:
 *      "Add an extra layer of excitement to your game"
 *    (regardless of the rest of the wording up to </p>).
 * 3. Remove the paragraph inside <FeedbackCard>...</FeedbackCard> (empties it).
 *
 * Environment variables:
 *   DRY_RUN    (default true)  -> set DRY_RUN=false to write changes
 *   CREATE_BAK (default true)  -> set CREATE_BAK=false to skip backups (CI usually false)
 *   VERBOSE    (default true)
 *
 * Idempotent: safe to rerun multiple times.
 */

const fs = require('fs/promises');
const path = require('path');

const DRY_RUN = process.env.DRY_RUN !== 'false';
const CREATE_BAK = process.env.CREATE_BAK !== 'false';
const VERBOSE = process.env.VERBOSE !== 'false';

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

console.log(`[config] DRY_RUN=${DRY_RUN} CREATE_BAK=${CREATE_BAK} VERBOSE=${VERBOSE}`);
console.log(`[config] Target directory: ${GAMES_DIR}`);

// Merge adjacent Special Edition + **Title** sections
const specialMergeRegex = new RegExp(
  String.raw`<GameSection\s+title="Special Edition"([^>]*)>([\s\S]*?)</GameSection>\s*` +
  String.raw`<GameSection\s+title="(\*\*[^"]+\*\*)"([^>]*)>([\s\S]*?)</GameSection>`,
  'gi'
);

// Broad intro paragraph removal: any paragraph starting with that phrase
// This catches playing:, using:, with:, typos after the phrase, etc.
const specialEditionIntroRegex = /<p>\s*Add an extra layer of excitement to your game[^<]*<\/p>\s*/gi;

// FeedbackCard paragraph removal
const feedbackParagraphRegex = /<FeedbackCard>\s*<p>[\s\S]*?<\/p>\s*<\/FeedbackCard>/gi;

async function collectFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`[error] Cannot read ${dir}: ${e.message}`);
    return out;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...await collectFiles(full));
    } else if (/\.(md|mdx)$/i.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function mergeSpecialSections(content) {
  let count = 0;
  const replaced = content.replace(specialMergeRegex, (match, attrs1, inner1, rawTitle, attrs2, inner2) => {
    count++;
    const heading = rawTitle
      .replace(/^\*\*\s*/, '')
      .replace(/\s*\*\*$/, '')
      .trim();
    const part1 = inner1.trimEnd();
    const part2 = inner2.trim();
    const spacer = /\n\s*$/.test(part1) ? '' : '\n\n';
    return `<GameSection title="Special Edition"${attrs1}>
${part1}${spacer}<h4>${heading}</h4>
${part2.startsWith('\n') ? part2 : '\n' + part2}
</GameSection>`;
  });
  return { replaced, count };
}

function removeIntro(content) {
  let removed = 0;
  const replaced = content.replace(specialEditionIntroRegex, () => {
    removed++;
    return '';
  });
  return { replaced, removed };
}

function stripFeedback(content) {
  let stripped = 0;
  const replaced = content.replace(feedbackParagraphRegex, () => {
    stripped++;
    return `<FeedbackCard>\n</FeedbackCard>`;
  });
  return { replaced, stripped };
}

async function processFile(file) {
  const original = await fs.readFile(file, 'utf8');
  let current = original;

  const { replaced: afterMerge, count: merges } = mergeSpecialSections(current);
  current = afterMerge;

  const { replaced: afterIntro, removed: introsRemoved } = removeIntro(current);
  current = afterIntro;

  const { replaced: afterFeedback, stripped: feedbackStripped } = stripFeedback(current);
  current = afterFeedback;

  const changed = merges || introsRemoved || feedbackStripped;

  if (VERBOSE) {
    if (changed) {
      console.log(`${DRY_RUN ? 'WOULD UPDATE' : 'UPDATED'} ${path.relative(GAMES_DIR, file)} [merges=${merges}] [introsRemoved=${introsRemoved}] [feedbackStripped=${feedbackStripped}]`);
    } else {
      console.log(`UNCHANGED ${path.relative(GAMES_DIR, file)}`);
    }
  }

  if (!changed || DRY_RUN) {
    return { changed: !DRY_RUN && changed, merges, introsRemoved, feedbackStripped };
  }

  if (CREATE_BAK) {
    const bak = `${file}.bak-${Date.now()}`;
    await fs.writeFile(bak, original, 'utf8');
  }
  await fs.writeFile(file, current, 'utf8');
  return { changed: true, merges, introsRemoved, feedbackStripped };
}

async function run() {
  const files = await collectFiles(GAMES_DIR);
  console.log(`Found ${files.length} game file(s).`);
  let totalMerges = 0;
  let totalIntros = 0;
  let totalFeedback = 0;
  let totalChanged = 0;

  for (const f of files) {
    try {
      const res = await processFile(f);
      totalMerges += res.merges || 0;
      totalIntros += res.introsRemoved || 0;
      totalFeedback += res.feedbackStripped || 0;
      if (res.changed) totalChanged++;
    } catch (e) {
      console.error('[error]', f, e.message);
    }
  }

  console.log('\nSummary:');
  console.log('  Files processed  :', files.length);
  console.log('  Files changed    :', totalChanged);
  console.log('  Special merges   :', totalMerges);
  console.log('  Intros removed   :', totalIntros);
  console.log('  Feedback stripped:', totalFeedback);
  console.log('Mode:', DRY_RUN ? 'DRY RUN' : 'APPLIED');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
