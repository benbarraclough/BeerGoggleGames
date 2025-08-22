/**
 * One-off slug rename utility.
 * Run: node scripts/rename-slugs.js
 */
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');
const RENAMES = {
  'french75.md': 'french-75.md',
  'don-t-interrupt.md': 'dont-interrupt.md',
  'kamikaze-cocktail.md': 'kamikaze.md'
};

const INLINE_REPLACE = false;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir)) {
    const full = path.join(dir, e);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (e.endsWith('.md')) out.push(full);
  }
  return out;
}

function main() {
  const mdFiles = walk(CONTENT_DIR);
  const byBase = new Map(mdFiles.map(f => [path.basename(f), f]));
  const results = [];

  for (const [oldName, newName] of Object.entries(RENAMES)) {
    const fromPath = byBase.get(oldName);
    if (!fromPath) { console.warn(`Skip (missing): ${oldName}`); continue; }
    const destPath = path.join(path.dirname(fromPath), newName);
    if (fs.existsSync(destPath)) { console.warn(`Skip (exists dest): ${newName}`); continue; }

    if (INLINE_REPLACE) {
      mdFiles.forEach(f => {
        const txt = fs.readFileSync(f, 'utf8');
        const replaced = txt.replace(new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newName);
        if (replaced !== txt) {
          fs.writeFileSync(f, replaced, 'utf8');
          console.log(`Updated reference in ${path.relative(process.cwd(), f)}`);
        }
      });
    }

    fs.renameSync(fromPath, destPath);
    console.log(`Renamed: ${oldName} → ${newName}`);
    results.push({ old: oldName, new: newName });
  }

  console.log('Summary:', results);
}

main();
