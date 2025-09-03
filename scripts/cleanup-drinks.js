#!/usr/bin/env node
/**
 * cleanup-drinks.js
 *
 * Purpose:
 *  Remove legacy drink content + routes + old migration scripts and normalize unified drink MDX files.
 *
 * Actions (all safe idempotent):
 *  - Delete legacy folders:
 *      src/content/cocktails
 *      src/content/shots
 *      src/pages/drinks/cocktail-recipes
 *      src/pages/drinks/shot-recipes
 *  - Delete old scripts:
 *      scripts/migrate-drinks.js
 *      scripts/remigrate-drinks.js (optional)
 *  - Clean each MDX in src/content/drinks:
 *      * Remove DrinkHero import + component (central hero now in dynamic route).
 *      * Strip difficulty placeholders (difficulty: "..." or empty -> remove).
 *      * Strip base: "" lines.
 *      * Normalize excerpt: leading "Description:" removed.
 *      * Remove duplicated hero figure leftover (if any).
 *      * Convert placeholder JSX comments to visible italic paragraph.
 *      * Ensure list indentation (optional).
 *      * Optional: remove empty tags: [] line if you want (disabled by default).
 *
 * Usage:
 *    node scripts/cleanup-drinks.js          (dry run)
 *    node scripts/cleanup-drinks.js --write  (apply changes)
 *
 * Exit codes:
 *  0 success
 *  0 dry run success
 *  >0 unexpected error
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const WRITE = process.argv.includes('--write');

// ---------------- Configuration toggles ----------------
const TASK_DELETE_LEGACY_FOLDERS = true;
const TASK_DELETE_OLD_MIGRATION_SCRIPTS = true;
const KEEP_REMIGRATE_SCRIPT = false; // set true if you want to retain latest re-migration script
const TASK_CLEAN_MDX = true;
const TASK_REMOVE_EMPTY_TAGS = false; // set true to remove lines tags: [] if present
const TASK_FIX_LIST_INDENT = true;
// --------------------------------------------------------

const legacyFolders = [
  'src/content/cocktails',
  'src/content/shots',
  'src/pages/drinks/cocktail-recipes',
  'src/pages/drinks/shot-recipes'
];

const legacyScripts = [
  'scripts/migrate-drinks.js',
  ...(KEEP_REMIGRATE_SCRIPT ? [] : ['scripts/remigrate-drinks.js'])
];

const drinksDir = path.join(ROOT, 'src', 'content', 'drinks');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function deleteRecursive(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  fs.rmSync(full, { recursive: true, force: true });
}

function listDrinkFiles() {
  if (!fs.existsSync(drinksDir)) return [];
  return fs.readdirSync(drinksDir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => path.join(drinksDir, f));
}

const actions = [];

function logAction(type, target, note='') {
  actions.push({ type, target: path.relative(ROOT, target), note });
}

function cleanFrontmatterBlock(frontmatter) {
  let changed = false;
  // Normalize 'excerpt: "Description: ...."'
  frontmatter = frontmatter.replace(
    /^excerpt:\s*"(?:Description:\s*)?([^"]*)"/m,
    (m, inner) => {
      changed = true;
      return `excerpt: "${inner.trim()}"`;
    }
  );

  // Remove difficulty placeholders difficulty: "..." or difficulty: "" or difficulty: ''
  frontmatter = frontmatter.replace(/^difficulty:\s*["']{0,1}\.\.\.["']{0,1}\s*$/m, () => {
    changed = true;
    return '';
  });
  frontmatter = frontmatter.replace(/^difficulty:\s*["']{0,1}["']{0,1}\s*$/m, () => {
    changed = true;
    return '';
  });

  // Remove base: "" empty
  frontmatter = frontmatter.replace(/^base:\s*["']{0,1}["']{0,1}\s*$/m, () => {
    changed = true;
    return '';
  });

  // Optionally remove empty tags line
  if (TASK_REMOVE_EMPTY_TAGS) {
    frontmatter = frontmatter.replace(/^tags:\s*\[\]\s*$/m, () => {
      changed = true;
      return '';
    });
  }

  // Remove stray blank lines (multiple) inside frontmatter
  frontmatter = frontmatter.replace(/\n{3,}/g, '\n\n');

  return { frontmatter, changed };
}

function removeDrinkHero(content) {
  let changed = false;
  const original = content;

  // Remove import line
  content = content.replace(/^import\s+DrinkHero\s+from\s+['"].+?['"];?\s*$/m, () => {
    changed = true;
    return '';
  });

  // Remove standalone DrinkHero usage block (<DrinkHero ... />)
  content = content.replace(/<DrinkHero[\s\S]*?\/>\s*/m, (m) => {
    changed = true;
    return '';
  });

  if (changed) {
    // Clean leftover double blank lines
    content = content.replace(/\n{3,}/g, '\n\n');
  }

  return { content, changed };
}

function fixPlaceholderComments(content) {
  let changed = false;
  // Replace JSX placeholders with visible italic paragraphs
  const map = [
    { re: /\{\/\*\s*Add ingredients\s*\*\/\}/g, rep: '<p><em>Add ingredients...</em></p>' },
    { re: /\{\/\*\s*Add steps\s*\*\/\}/g, rep: '<p><em>Add steps...</em></p>' },
    { re: /\{\/\*\s*Add overview details\s*\*\/\}/g, rep: '<p><em>Add overview details...</em></p>' }
  ];
  map.forEach(({ re, rep }) => {
    if (re.test(content)) {
      content = content.replace(re, rep);
      changed = true;
    }
  });
  return { content, changed };
}

function fixListIndent(content) {
  if (!TASK_FIX_LIST_INDENT) return { content, changed: false };
  let changed = false;

  // Ensure <ol> and <ul> items are consistently indented (purely cosmetic)
  content = content.replace(/<ol>\s*\n([\s\S]*?)\n<\/ol>/g, (m, inner) => {
    const lines = inner.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.startsWith('<li') ? `  ${l}` : l);
    const rebuilt = `<ol>\n${lines.join('\n')}\n</ol>`;
    if (rebuilt !== m) changed = true;
    return rebuilt;
  });

  content = content.replace(/<ul>\s*\n([\s\S]*?)\n<\/ul>/g, (m, inner) => {
    const lines = inner.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.startsWith('<li') ? `  ${l}` : l);
    const rebuilt = `<ul>\n${lines.join('\n')}\n</ul>`;
    if (rebuilt !== m) changed = true;
    return rebuilt;
  });

  return { content, changed };
}

function stripDuplicateHeroFigure(content) {
  // If a nested <figure><figure> duplication happened, remove outer figure.
  let changed = false;
  content = content.replace(/<figure[^>]*>\s*<figure/gi, (m) => {
    changed = true;
    return '<figure';
  });
  return { content, changed };
}

function processDrinkFile(fullPath) {
  let text = fs.readFileSync(fullPath, 'utf8');
  const original = text;
  let changed = false;

  // Split frontmatter if present
  const fmMatch = text.match(/^---\n[\s\S]*?\n---/);
  if (!fmMatch) return { changed: false };
  const fmBlock = fmMatch[0];
  const body = text.slice(fmBlock.length);

  const { frontmatter: newFm, changed: fmChanged } = cleanFrontmatterBlock(fmBlock);
  if (fmChanged) changed = true;

  let newBody = body;

  // Remove DrinkHero
  const drinkHeroResult = removeDrinkHero(newBody);
  if (drinkHeroResult.changed) {
    newBody = drinkHeroResult.content;
    changed = true;
  }

  // Strip duplicate hero figure wrapper
  const dupHero = stripDuplicateHeroFigure(newBody);
  if (dupHero.changed) {
    newBody = dupHero.content;
    changed = true;
  }

  // Placeholder comments
  const placeholder = fixPlaceholderComments(newBody);
  if (placeholder.changed) {
    newBody = placeholder.content;
    changed = true;
  }

  // List indentation
  const listFix = fixListIndent(newBody);
  if (listFix.changed) {
    newBody = listFix.content;
    changed = true;
  }

  if (changed) {
    // Remove excessive blank lines near frontmatter boundary
    let rebuilt = `${newFm}\n${newBody}`;
    rebuilt = rebuilt.replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(fullPath, rebuilt, 'utf8');
    logAction('modify', fullPath, 'normalized mdx');
  }
  return { changed };
}

function run() {
  console.log(`\n=== CLEANUP DRINKS (${WRITE ? 'WRITE' : 'DRY RUN'}) ===\n`);

  if (TASK_DELETE_LEGACY_FOLDERS) {
    legacyFolders.forEach(rel => {
      if (exists(rel)) {
        logAction('delete', path.join(ROOT, rel), 'legacy folder');
        if (WRITE) deleteRecursive(rel);
      }
    });
  }

  if (TASK_DELETE_OLD_MIGRATION_SCRIPTS) {
    legacyScripts.forEach(rel => {
      if (exists(rel)) {
        logAction('delete', path.join(ROOT, rel), 'legacy script');
        if (WRITE) fs.unlinkSync(path.join(ROOT, rel));
      }
    });
  }

  if (TASK_CLEAN_MDX) {
    if (!fs.existsSync(drinksDir)) {
      console.warn('Drinks directory not found, skipping MDX normalization.');
    } else {
      const files = listDrinkFiles();
      files.forEach(f => processDrinkFile(f));
      if (!files.length) {
        console.log('No drink MDX files found to clean.');
      }
    }
  }

  // Summary
  if (!actions.length) {
    console.log('No actions required. Repository is already clean.\n');
  } else {
    console.log('Planned / Performed actions:\n');
    for (const a of actions) {
      console.log(`- ${a.type.toUpperCase()}: ${a.target}${a.note ? ' (' + a.note + ')' : ''}`);
    }
    console.log(`\n${WRITE ? 'Applied all changes.' : 'Dry run only. Re-run with --write to apply.'}\n`);
  }
}

try {
  run();
  process.exit(0);
} catch (err) {
  console.error('Cleanup failed:', err);
  process.exit(1);
}
