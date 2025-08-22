/**
 * Normalize image references in existing markdown content.
 *
 * What it does:
 *  - Rewrites markdown and HTML <img> paths that start with:
 *      images/...  ./images/...  ../images/...
 *    to root-relative /images/...
 *  - Collects every referenced /images/<filename>
 *  - Ensures public/images/<filename> exists:
 *      - If missing, searches legacy/ recursively (case-insensitive basename match)
 *        and copies the first match it finds.
 *  - Prints a summary and any unresolved images.
 *
 * Safe to run multiple times.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const LEGACY_DIR = path.join(ROOT, 'legacy');
const PUBLIC_IMAGES_DIR = path.join(ROOT, 'public', 'images');

function walk(dir, filterExt = null) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full, filterExt));
    else if (!filterExt || filterExt.test(entry)) out.push(full);
  }
  return out;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function normalizeContent(content) {
  // Markdown image syntax ![alt](images/foo.png)
  // Generic link/image patterns plus HTML <img src="images/foo.png">
  // We ONLY touch paths that start directly with (images/, (./images/, (../images/
  // or src="images/  src="./images/  src="../images/
  const patterns = [
    { regex: /(!\[[^\]]*\]\()\.{0,2}\/?images\//gi, replace: (m, p1) => `${p1}/images/` },
    { regex: /(<img[^>]*\s+src=["'])\.{0,2}\/?images\//gi, replace: (m, p1) => `${p1}/images/` }
  ];
  let changed = content;
  patterns.forEach(p => {
    changed = changed.replace(p.regex, p.replace);
  });
  // Collapse possible double slashes (but avoid protocol)
  changed = changed.replace(/(?<!:)\/\/images\//g, '/images/');
  return changed;
}

function extractReferencedImages(content) {
  const refs = new Set();
  // Markdown ![... ](/images/foo.png) or plain link ](/images/foo.png)
  const mdRegex = /]\(\s*\/images\/([^)\s]+)\s*\)/gi;
  const imgRegex = /<img[^>]*\ssrc=["']\/images\/([^"']+)["']/gi;

  let m;
  while ((m = mdRegex.exec(content))) {
    refs.add(m[1].split('?')[0]);
  }
  while ((m = imgRegex.exec(content))) {
    refs.add(m[1].split('?')[0]);
  }
  return [...refs];
}

function buildLegacyIndex() {
  // Map basename lower → absolute path (first occurrence kept)
  const index = new Map();
  const files = walk(LEGACY_DIR);
  files.forEach(f => {
    const base = path.basename(f).toLowerCase();
    if (!index.has(base)) index.set(base, f);
  });
  return index;
}

function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('No src/content directory.');
    process.exit(1);
  }
  ensureDir(PUBLIC_IMAGES_DIR);

  const mdFiles = walk(CONTENT_DIR, /\.md$/i);
  console.log(`Scanning ${mdFiles.length} markdown files...`);

  const allReferenced = new Set();
  let modifiedCount = 0;

  mdFiles.forEach(file => {
    const original = fs.readFileSync(file, 'utf8');
    const normalized = normalizeContent(original);
    if (normalized !== original) {
      fs.writeFileSync(file, normalized, 'utf8');
      modifiedCount++;
      console.log(`Rewrote image paths in: ${path.relative(ROOT, file)}`);
    }
    const refs = extractReferencedImages(normalized);
    refs.forEach(r => allReferenced.add(r));
  });

  console.log(`Image path normalization complete. Files modified: ${modifiedCount}`);
  console.log(`Unique referenced images: ${allReferenced.size}`);

  const legacyIndex = buildLegacyIndex();
  const unresolved = [];

  allReferenced.forEach(imgName => {
    const target = path.join(PUBLIC_IMAGES_DIR, imgName);
    if (fs.existsSync(target)) return;
    const legacyMatch = legacyIndex.get(imgName.toLowerCase());
    if (legacyMatch) {
      try {
        fs.copyFileSync(legacyMatch, target);
        console.log(`Copied ${imgName} from legacy → public/images/${imgName}`);
      } catch (e) {
        console.warn(`Failed to copy ${imgName}: ${e.message}`);
        unresolved.push(imgName);
      }
    } else {
      unresolved.push(imgName);
    }
  });

  if (unresolved.length) {
    console.log('---- UNRESOLVED IMAGES (not found in legacy, still missing) ----');
    unresolved.forEach(i => console.log(i));
    console.log('Add these manually to public/images/.');
  } else {
    console.log('All referenced images are present.');
  }
}

main();
