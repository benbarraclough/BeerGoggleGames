#!/usr/bin/env node
/**
 * Migration Script:
 *   Merge src/content/cocktails + src/content/shots into src/content/drinks
 *   Convert .md/.mdx to unified MDX with new frontmatter.
 *
 * Usage:
 *   node scripts/migrate-drinks.js          (dry run)
 *   node scripts/migrate-drinks.js --write  (apply changes)
 *
 * What it does:
 *  - Reads cocktails & shots folders (if present).
 *  - Normalizes alcohol base fields to bases[].
 *  - Adds drinkType: 'cocktail' | 'shot'.
 *  - Ensures cover defaults to {slug}.webp.
 *  - Converts to MDX w/ standardized scaffold using DrinkHero & DrinkSection.
 *  - Backs up originals under .migrate-backup/drinks-<timestamp>/.
 *
 * After running with --write:
 *  - Inspect new files in src/content/drinks.
 *  - Remove old cocktails/shots folders & old collection definitions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const cocktailsDir = path.join(projectRoot, 'src', 'content', 'cocktails');
const shotsDir = path.join(projectRoot, 'src', 'content', 'shots');
const drinksDir = path.join(projectRoot, 'src', 'content', 'drinks');

const writeMode = process.argv.includes('--write');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function listContentFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(md|mdx)$/i.test(f))
    .map(f => path.join(dir, f));
}

function extractBases(data) {
  const keys = [
    'alcoholBase',
    'baseAlcohol',
    'base',
    'bases',
    'spirits',
    'spirit',
    'alcohol'
  ];
  let raw;
  for (const k of keys) {
    if (data[k]) {
      raw = data[k];
      break;
    }
  }
  if (!raw) return [];
  if (typeof raw === 'string') {
    raw = raw.split(/[\/,]/);
  }
  if (!Array.isArray(raw)) raw = [raw];
  return raw
    .map(v => (v ?? '').toString().trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

function toArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function buildMDX(slug, fm, body) {
  const {
    title,
    drinkType,
    bases,
    difficulty,
    tags,
    cover,
    excerpt,
    ingredients,
    method
  } = fm;

  const coverPath = cover || `${slug}.webp`;

  const methodContent = method?.length
    ? method.map(step => `<li>${step}</li>`).join('\n')
    : null;

  const ingredientsContent = ingredients?.length
    ? ingredients.map(i => `<li>${i}</li>`).join('\n')
    : null;

  const fallbackBody = body.trim() ? body.trim() : '_No method provided yet._';

  return `---
title: ${JSON.stringify(title || slug)}
drinkType: ${JSON.stringify(drinkType)}
bases: ${JSON.stringify(bases)}
${difficulty ? `difficulty: ${JSON.stringify(difficulty)}\n` : ''}${excerpt ? `excerpt: ${JSON.stringify(excerpt)}\n` : ''}cover: ${JSON.stringify(coverPath)}
tags: ${JSON.stringify(tags || [])}
${ingredients && ingredients.length ? `ingredients:\n${ingredients.map(i => `  - ${i}`).join('\n')}\n` : ''}${method && method.length ? `method:\n${method.map(m => `  - ${m}`).join('\n')}\n` : ''}---

import DrinkHero from '../../components/drink/DrinkHero.astro';
import DrinkSection from '../../components/drink/DrinkSection.astro';
import ShareButtons from '../../components/game/ShareButtons.astro';
import FeedbackCard from '../../components/game/FeedbackCard.astro';

<DrinkHero
  cover={'/BeerGoggleGames/images/${coverPath}'}
  alt={${JSON.stringify(title || slug)}}
/>

<DrinkSection title="Ingredients" icon="/BeerGoggleGames/images/liquor.webp">
${ingredientsContent
  ? `<ul>\n${ingredientsContent}\n</ul>`
  : '<!-- Add ingredients list here -->'}
</DrinkSection>

<DrinkSection title="Method" icon="/BeerGoggleGames/images/question.webp">
${methodContent
  ? `<ol>\n${methodContent}\n</ol>`
  : fallbackBody}
</DrinkSection>

${difficulty ? `<DrinkSection title="Difficulty" icon="/BeerGoggleGames/images/settings.webp">
<p>${difficulty}</p>
</DrinkSection>` : ''}

<ShareButtons title={${JSON.stringify(title || slug)}} />
<FeedbackCard></FeedbackCard>
`;
}

function migrateDir(dir, drinkType) {
  const files = listContentFiles(dir);
  return files.map(file => {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    const slug = path.basename(file).replace(/\.mdx?$/i, '');
    const bases = extractBases(parsed.data);
    const difficulty = (parsed.data.difficulty || '').toString().trim().toLowerCase();
    const cover = parsed.data.cover || `${slug}.webp`;
    const tags = toArray(parsed.data.tags);
    const excerpt = parsed.data.excerpt;
    const ingredients = toArray(parsed.data.ingredients);
    const method = toArray(parsed.data.method);

    const newFM = {
      title: parsed.data.title || slug,
      drinkType,
      bases,
      difficulty,
      tags,
      cover,
      excerpt,
      ingredients,
      method
    };

    const newContent = buildMDX(slug, newFM, parsed.content);
    const outPath = path.join(drinksDir, `${slug}.mdx`);
    return { source: file, slug, drinkType, outPath, newContent };
  });
}

function run() {
  console.log(`\n=== ${writeMode ? 'MIGRATION (WRITE MODE)' : 'DRY RUN'}: cocktails + shots -> drinks ===\n`);

  const migrations = [
    ...migrateDir(cocktailsDir, 'cocktail'),
    ...migrateDir(shotsDir, 'shot')
  ];

  if (!migrations.length) {
    console.log('No cocktail or shot files found. Nothing to migrate.');
    return;
  }

  migrations.forEach(m => {
    console.log(`• ${path.relative(projectRoot, m.source)} -> ${path.relative(projectRoot, m.outPath)}`);
  });

  if (!writeMode) {
    console.log('\nDry run complete. Re-run with --write to apply changes.\n');
    return;
  }

  ensureDir(drinksDir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(projectRoot, '.migrate-backup', `drinks-${ts}`);
  ensureDir(backupDir);

  migrations.forEach(m => {
    // Backup original
    const backupFile = path.join(backupDir, path.basename(m.source));
    fs.copyFileSync(m.source, backupFile);
    // Write unified MDX
    fs.writeFileSync(m.outPath, m.newContent, 'utf8');
  });

  console.log(`\nWrote ${migrations.length} drink MDX files to ${path.relative(projectRoot, drinksDir)}`);
  console.log(`Backups stored in ${path.relative(projectRoot, backupDir)}`);
  console.log('\nYou may now remove src/content/cocktails and src/content/shots after verifying.\n');
}

run();
