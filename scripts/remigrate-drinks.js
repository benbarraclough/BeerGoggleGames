#!/usr/bin/env node
/**
 * Re-Migration Script (v4)
 *
 * Rebuild /src/content/drinks from /src/content/cocktails & /src/content/shots.
 * It parses your legacy page structure and outputs clean MDX matching the desired format:
 *
 *  Frontmatter:
 *    title, drinkType, excerpt (cleaned), base (singular), difficulty (lowercase),
 *    cover (slug.webp if none / placeholder), tags (empty array)
 *
 *  Sections:
 *    <DrinkHero />
 *    <DrinkSection title="Overview"> (with lines for Description, Time, Difficulty, Glass type, Dietary Notes, Origin)
 *    <DrinkSection title="Ingredients"> (ordered list)
 *    <DrinkSection title="Recipe"> (ordered list of steps)
 *    <DrinkSection title="Tips"> (if any)
 *    ShareButtons + FeedbackCard
 *
 * USAGE:
 *   node scripts/remigrate-drinks.js          (dry run)
 *   node scripts/remigrate-drinks.js --write  (write files)
 *
 * BEFORE RUN:
 *   - Ensure src/content/drinks is deleted or empty (you're recreating it).
 *   - Ensure original cocktail & shot markdown files are still present.
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
const outDir = path.join(ROOT, 'src', 'content', 'drinks');

const WRITE = process.argv.includes('--write');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function list(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f=>/\.(md|mdx)$/i.test(f))
    .map(f=>path.join(dir,f));
}
function read(f){ return fs.readFileSync(f,'utf8'); }
function slugOf(f){ return path.basename(f).replace(/\.mdx?$/,''); }

const spiritPatterns = [
  {re:/\bvodka\b/i, base:'vodka'},
  {re:/\brum\b/i, base:'rum'},
  {re:/\bgin\b/i, base:'gin'},
  {re:/\btequila\b/i, base:'tequila'},
  {re:/\bwhisk(?:e?)y\b/i, base:'whisky'},
  {re:/\bbourbon\b/i, base:'bourbon'},
  {re:/\bbrandy\b/i, base:'brandy'},
  {re:/\bamaretto\b/i, base:'liqueur'},
  {re:/\btriple\s+sec\b/i, base:'liqueur'},
  {re:/\bcointreau\b/i, base:'liqueur'},
  {re:/\bsambuca\b/i, base:'liqueur'},
  {re:/\bvermouth\b/i, base:'vermouth'},
  {re:/\bj[äa]germeister\b/i, base:'liqueur'},
  {re:/\blimoncello\b/i, base:'liqueur'}
];

function detectBase(ingredients, steps){
  const joined = [...ingredients, ...steps].join('\n');
  for(const p of spiritPatterns){
    if(p.re.test(joined)) return p.base;
  }
  return '';
}

function cleanExcerpt(e){
  if(!e) return '';
  return e.replace(/^\s*Description:\s*/i,'').trim();
}

function sectionBetween(source, startRe, stopRes){
  const m = source.match(startRe);
  if(!m) return '';
  const start = m.index + m[0].length;
  let end = source.length;
  for(const r of stopRes){
    const mm = source.slice(start).match(r);
    if(mm){
      const idx = start + mm.index;
      if(idx < end) end = idx;
    }
  }
  return source.slice(start, end).trim();
}

function parseLegacyBody(bodyRaw){
  const body = bodyRaw.replace(/\r\n/g,'\n');

  const stopRes = [
    /^###\s+Ingredients/im,
    /^###\s+Recipe/im,
    /^###\s+Method/im,
    /^###\s+Top Tips/im,
    /^####\s+Share/im,
    /^####\s+Feedback/im
  ];

  const overviewBlock = sectionBetween(body, /^####\s*Overview.*$/im, stopRes);
  const ingredientsBlock = sectionBetween(body, /^###\s*Ingredients.*$/im, stopRes);
  const recipeBlock = sectionBetween(body, /^###\s*(Recipe|Method).*$/im, stopRes);
  const tipsBlock = sectionBetween(body, /^###\s*Top Tips.*$/im, stopRes);

  // Overview key-value extraction
  const overview = { description:'', time:'', difficulty:'', glass:'', dietary:'', origin:'' };
  overviewBlock.split('\n').map(l=>l.trim()).filter(Boolean).forEach(line=>{
    const m = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if(!m) return;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if(/description/.test(key)) overview.description = val;
    else if(/^time/.test(key)) overview.time = val;
    else if(/difficulty/.test(key)) overview.difficulty = val;
    else if(/glass/.test(key)) overview.glass = val;
    else if(/dietary/.test(key)) overview.dietary = val;
    else if(/origin/.test(key)) overview.origin = val;
  });

  function parseList(str){
    if(!str) return [];
    return str.split('\n')
      .map(l=>l.trim())
      .filter(l=>l && !/^#{2,}/.test(l))
      .map(l=>l.replace(/^\d+\.\s*/,'').replace(/^[-*+]\s*/,''))
      .filter(Boolean);
  }

  const ingredients = parseList(ingredientsBlock);
  const recipeSteps = parseList(recipeBlock);
  const tips = parseList(tipsBlock);

  return { overview, ingredients, recipeSteps, tips };
}

function buildMDX({
  slug, title, drinkType, excerpt, base, difficulty, cover,
  overview, ingredients, recipeSteps, tips
}){
  const coverFile = cover || `${slug}.webp`;

  const lines = [];
  if(overview.description) lines.push(`<p><strong>Description:</strong> ${overview.description}</p>`);
  if(overview.time) lines.push(`<p><strong>Time:</strong> ${overview.time}</p>`);
  if(difficulty) lines.push(`<p><strong>Difficulty:</strong> ${capitalize(difficulty)}</p>`);
  if(overview.glass) lines.push(`<p><strong>Glass type:</strong> ${overview.glass}</p>`);
  if(overview.dietary) lines.push(`<p><strong>Dietary Notes:</strong> ${overview.dietary}</p>`);
  if(overview.origin) lines.push(`<p><strong>Origin:</strong> ${overview.origin}</p>`);

  const ingredientsList = ingredients.length
    ? `<ol>\n${ingredients.map(i=>`  <li>${i}</li>`).join('\n')}\n</ol>`
    : '<!-- Add ingredients -->';

  const recipeList = recipeSteps.length
    ? `<ol>\n${recipeSteps.map(s=>`  <li>${s}</li>`).join('\n')}\n</ol>`
    : '<!-- Add steps -->';

  const tipsBlock = tips.length
    ? `<DrinkSection title="Tips" icon="/BeerGoggleGames/images/lightbulb.webp">
  <ul>
${tips.map(t=>`    <li>${t}</li>`).join('\n')}
  </ul>
</DrinkSection>`
    : '';

  return `---
title: ${JSON.stringify(title)}
drinkType: ${JSON.stringify(drinkType)}
excerpt: ${JSON.stringify(excerpt || overview.description || '')}
base: ${JSON.stringify(base || '')}
difficulty: ${difficulty ? JSON.stringify(difficulty) : ''}
cover: ${JSON.stringify(coverFile)}
tags: []
---

import DrinkHero from '../../components/drink/DrinkHero.astro';
import DrinkSection from '../../components/drink/DrinkSection.astro';
import ShareButtons from '../../components/game/ShareButtons.astro';
import FeedbackCard from '../../components/game/FeedbackCard.astro';

<DrinkHero
  cover={'/BeerGoggleGames/images/${coverFile}'}
  alt={${JSON.stringify(title)}}
/>

<DrinkSection title="Overview" icon="/BeerGoggleGames/images/info.webp">
  ${lines.join('\n  ') || '<!-- Add overview details -->'}
</DrinkSection>

<DrinkSection title="Ingredients" icon="/BeerGoggleGames/images/liquor.webp">
  ${ingredientsList}
</DrinkSection>

<DrinkSection title="Recipe" icon="/BeerGoggleGames/images/rules.webp">
  ${recipeList}
</DrinkSection>

${tipsBlock}

<ShareButtons title={${JSON.stringify(title)}} />
<FeedbackCard></FeedbackCard>
`;
}

function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }

function migrateDir(dir, drinkType){
  return list(dir).map(file=>{
    const slug = slugOf(file);
    const raw = read(file);
    const parsed = matter(raw);
    const body = parsed.content;
    const { overview, ingredients, recipeSteps, tips } = parseLegacyBody(body);

    let difficulty = (parsed.data.difficulty || overview.difficulty || '').toString().trim().toLowerCase();
    let excerpt = parsed.data.excerpt || parsed.data.description || overview.description || '';
    excerpt = cleanExcerpt(excerpt);

    // cover: prefer explicit cover; else look for first image in body; else slug.webp
    let cover = parsed.data.cover;
    if(!cover || /BGGBW\.webp/i.test(cover)){
      const imgMatch = body.match(/!\[[^\]]*]\((\/images\/([^)]+?\.webp))\)/i);
      if(imgMatch) cover = imgMatch[2];
      else cover = `${slug}.webp`;
    }

    const baseGuess = detectBase(ingredients, recipeSteps);

    const outContent = buildMDX({
      slug,
      title: parsed.data.title || slug.replace(/-/g,' '),
      drinkType,
      excerpt,
      base: parsed.data.base || baseGuess,
      difficulty,
      cover,
      overview,
      ingredients,
      recipeSteps,
      tips
    });

    return {
      file,
      outFile: path.join(outDir, `${slug}.mdx`),
      slug,
      drinkType,
      content: outContent
    };
  });
}

function run(){
  console.log(`\n=== ${WRITE ? 'RE-MIGRATION (WRITE)' : 'RE-MIGRATION DRY RUN'} ===\n`);
  const tasks = [
    ...migrateDir(cocktailsDir, 'cocktail'),
    ...migrateDir(shotsDir, 'shot')
  ];
  if(!tasks.length){
    console.log('No source cocktail or shot files found.');
    return;
  }
  tasks.forEach(t=>{
    console.log(`• ${path.relative(ROOT,t.file)} -> ${path.relative(ROOT,t.outFile)}`);
  });

  if(!WRITE){
    console.log('\nDry run complete. Use --write to apply.\n');
    return;
  }

  ensureDir(outDir);
  const backupDir = path.join(ROOT, '.migrate-backup', 'remigrate-' + Date.now());
  ensureDir(backupDir);

  // Backup any existing drink files (should be empty now)
  if(fs.existsSync(outDir)){
    fs.readdirSync(outDir)
      .filter(f=>f.endsWith('.mdx'))
      .forEach(f=>{
        fs.copyFileSync(path.join(outDir,f), path.join(backupDir,f));
      });
  }

  tasks.forEach(t=>{
    fs.writeFileSync(t.outFile, t.content, 'utf8');
  });

  console.log(`\nWrote ${tasks.length} files.`);
  console.log(`Backup (if any previous) at: ${path.relative(ROOT, backupDir)}\n`);
}

run();
