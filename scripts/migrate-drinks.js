#!/usr/bin/env node
/**
 * Migration Script (v3):
 *   Merge src/content/cocktails + src/content/shots into src/content/drinks (unified collection)
 *   Convert .md / .mdx -> standardized MDX with DrinkHero + DrinkSection components.
 *
 * Usage:
 *   node scripts/migrate-drinks.js          (dry run)
 *   node scripts/migrate-drinks.js --write  (apply changes)
 *
 * Safe to run multiple times (will overwrite unified file if same slug).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const cocktailsDir = path.join(ROOT, 'src', 'content', 'cocktails');
const shotsDir = path.join(ROOT, 'src', 'content', 'shots');
const drinksDir = path.join(ROOT, 'src', 'content', 'drinks');

const WRITE = process.argv.includes('--write');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(md|mdx)$/i.test(f))
    .map(f => path.join(dir, f));
}

function unique(arr) {
  return arr.filter((v,i,a)=>a.indexOf(v)===i);
}

function toArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function extractBases(data) {
  const keys = ['bases','alcoholBase','baseAlcohol','base','spirits','spirit','alcohol'];
  let raw;
  for (const k of keys) {
    if (data[k]) { raw = data[k]; break; }
  }
  if (!raw) return [];
  if (typeof raw === 'string') raw = raw.split(/[\/,]/);
  if (!Array.isArray(raw)) raw = [raw];
  return unique(raw.map(v => (v ?? '').toString().trim()).filter(Boolean));
}

function buildMDX(slug, fm, rawBody) {
  const {
    title,
    drinkType,
    bases,
    difficulty,
    tags,
    cover,
    excerpt,
    ingredients,
    method,
    time,
    glassType,
    dietary,
    origin,
    tips
  } = fm;

  const coverFile = cover || `${slug}.webp`;

  const ingBlock = ingredients?.length
    ? `<ul>\n${ingredients.map(i=>`<li>${i}</li>`).join('\n')}\n</ul>`
    : '<!-- Add ingredients -->';

  const methodBlock = method?.length
    ? `<ol>\n${method.map(s=>`<li>${s}</li>`).join('\n')}\n</ol>`
    : (rawBody.trim() ? rawBody.trim() : '_No method provided yet._');

  const tipsBlock = tips?.length
    ? `<ul>\n${tips.map(t=>`<li>${t}</li>`).join('\n')}\n</ul>`
    : '';

  const overviewLines = [];
  if (excerpt) overviewLines.push(`<p><strong>Description:</strong> ${excerpt}</p>`);
  if (time) overviewLines.push(`<p><strong>Time:</strong> ${time}</p>`);
  if (difficulty) overviewLines.push(`<p><strong>Difficulty:</strong> ${difficulty}</p>`);
  if (glassType) overviewLines.push(`<p><strong>Glass type:</strong> ${glassType}</p>`);
  if (dietary) overviewLines.push(`<p><strong>Dietary:</strong> ${dietary}</p>`);
  if (origin) overviewLines.push(`<p><strong>Origin:</strong> ${origin}</p>`);

  return `---
title: ${JSON.stringify(title || slug)}
drinkType: ${JSON.stringify(drinkType)}
bases: ${JSON.stringify(bases)}
${difficulty ? `difficulty: ${JSON.stringify(difficulty)}\n` : ''}cover: ${JSON.stringify(coverFile)}
${excerpt ? `excerpt: ${JSON.stringify(excerpt)}\n` : ''}tags: ${JSON.stringify(tags || [])}
${ingredients?.length ? `ingredients:\n${ingredients.map(i=>`  - ${i}`).join('\n')}\n` : ''}${method?.length ? `method:\n${method.map(m=>`  - ${m}`).join('\n')}\n` : ''}${time ? `time: ${JSON.stringify(time)}\n` : ''}${glassType ? `glassType: ${JSON.stringify(glassType)}\n` : ''}${dietary ? `dietary: ${JSON.stringify(dietary)}\n` : ''}${origin ? `origin: ${JSON.stringify(origin)}\n` : ''}${tips?.length ? `tips:\n${tips.map(t=>`  - ${t}`).join('\n')}\n` : ''}---

import DrinkHero from '../../components/drink/DrinkHero.astro';
import DrinkSection from '../../components/drink/DrinkSection.astro';
import ShareButtons from '../../components/game/ShareButtons.astro';
import FeedbackCard from '../../components/game/FeedbackCard.astro';

<DrinkHero
  cover={'/BeerGoggleGames/images/${coverFile}'}
  alt={${JSON.stringify(title || slug)}}
/>

${overviewLines.length ? `<DrinkSection title="Overview" icon="/BeerGoggleGames/images/info.webp">
${overviewLines.join('\n')}
</DrinkSection>` : ''}

<DrinkSection title="Ingredients" icon="/BeerGoggleGames/images/liquor.webp">
${ingBlock}
</DrinkSection>

<DrinkSection title="Method" icon="/BeerGoggleGames/images/question.webp">
${methodBlock}
</DrinkSection>

${tipsBlock ? `<DrinkSection title="Top Tips" icon="/BeerGoggleGames/images/lightbulb.webp">
${tipsBlock}
</DrinkSection>` : ''}

<ShareButtons title={${JSON.stringify(title || slug)}} />
<FeedbackCard></FeedbackCard>
`;
}

function migrateDir(dir, drinkType) {
  const files = listFiles(dir);
  return files.map(file => {
    const raw = fs.readFileSync(file,'utf8');
    const parsed = matter(raw);
    const slug = path.basename(file).replace(/\.mdx?$/i,'');
    const bases = extractBases(parsed.data);
    const difficulty = (parsed.data.difficulty || '').toString().trim().toLowerCase();
    const cover = parsed.data.cover || `${slug}.webp`;
    const tags = toArray(parsed.data.tags);
    const ingredients = toArray(parsed.data.ingredients);
    const method = toArray(parsed.data.method);
    const time = parsed.data.time || '';
    const glassType = parsed.data.glassType || parsed.data.glass || '';
    const dietary = parsed.data.dietary || parsed.data.dietaryNotes || '';
    const origin = parsed.data.origin || '';
    const tips = toArray(parsed.data.tips || parsed.data.topTips);

    const fm = {
      title: parsed.data.title || slug,
      drinkType,
      bases,
      difficulty,
      tags,
      cover,
      excerpt: parsed.data.excerpt || parsed.data.description,
      ingredients,
      method,
      time,
      glassType,
      dietary,
      origin,
      tips
    };

    const newContent = buildMDX(slug, fm, parsed.content);
    const outFile = path.join(drinksDir, `${slug}.mdx`);
    return { source: file, outFile, slug, drinkType };
  });
}

function run() {
  console.log(`\n=== ${WRITE ? 'MIGRATION (WRITE)' : 'DRY RUN'}: cocktails + shots -> drinks ===\n`);
  const migrations = [
    ...migrateDir(cocktailsDir, 'cocktail'),
    ...migrateDir(shotsDir, 'shot')
  ];
  if (!migrations.length) {
    console.log('No source cocktail/shot files found.');
    return;
  }
  migrations.forEach(m =>
    console.log(`• ${path.relative(ROOT,m.source)} -> ${path.relative(ROOT,m.outFile)}`));

  if (!WRITE) {
    console.log('\nDry run complete. Re-run with --write to apply changes.\n');
    return;
  }

  ensureDir(drinksDir);
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const backupDir = path.join(ROOT, '.migrate-backup', `drinks-${stamp}`);
  ensureDir(backupDir);

  migrations.forEach(m => {
    const srcContent = fs.readFileSync(m.source,'utf8');
    fs.writeFileSync(path.join(backupDir, path.basename(m.source)), srcContent);
    // Re-generate (fresh) for actual write to ensure consistency
    const raw = fs.readFileSync(m.source,'utf8');
    const parsed = matter(raw);
    // Rebuild MDX with previous logic (dup small overhead but fine)
    const bases = extractBases(parsed.data);
    const newParsed = matter(raw);
    const slug = m.slug;
    // Already built earlier; just trust initial generation
    // Simpler: reuse previously built content (avoid re-run)
    // (If you want, you can store content during first pass)
  });

  // Write actual prepared content (second pass to avoid re-parsing complexity)
  migrations.forEach(m => {
    // For correctness, rebuild once more (cheap)
    const raw = fs.readFileSync(m.source,'utf8');
    const parsed = matter(raw);
    const slug = m.slug;
    const bases = extractBases(parsed.data);
    const difficulty = (parsed.data.difficulty || '').toString().trim().toLowerCase();
    const cover = parsed.data.cover || `${slug}.webp`;
    const tags = toArray(parsed.data.tags);
    const ingredients = toArray(parsed.data.ingredients);
    const method = toArray(parsed.data.method);
    const time = parsed.data.time || '';
    const glassType = parsed.data.glassType || parsed.data.glass || '';
    const dietary = parsed.data.dietary || parsed.data.dietaryNotes || '';
    const origin = parsed.data.origin || '';
    const tips = toArray(parsed.data.tips || parsed.data.topTips);
    const fm = {
      title: parsed.data.title || slug,
      drinkType: m.drinkType,
      bases,
      difficulty,
      tags,
      cover,
      excerpt: parsed.data.excerpt || parsed.data.description,
      ingredients,
      method,
      time,
      glassType,
      dietary,
      origin,
      tips
    };
    const rebuilt = buildMDX(slug, fm, parsed.content);
    fs.writeFileSync(m.outFile, rebuilt, 'utf8');
  });

  console.log(`\nMigrated ${migrations.length} files to ${path.relative(ROOT, drinksDir)}`);
  console.log(`Backups stored in .migrate-backup/${path.basename(path.dirname(migrations[0].source)) ? '' : ''}`);
  console.log('\nReview results, then remove old cocktails & shots directories.\n');
}

run();
