/**
 * Normalize image references in markdown:
 *  - Rewrites images/... , ./images/... , ../images/... to /images/...
 *  - Copies missing image files from legacy/ (case-insensitive basename match) into public/images/
 *  - Lists unresolved images at end (but does NOT fail the build)
 *
 * Run multiple times safely.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const LEGACY_DIR = path.join(ROOT, 'legacy');
const PUBLIC_IMAGES_DIR = path.join(ROOT, 'public', 'images');

function walk(dir, extRegex = null) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full, extRegex));
    else if (!extRegex || extRegex.test(entry)) out.push(full);
  }
  return out;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function normalizeContent(content) {
  // Markdown + HTML variants beginning with optional ./ or ../ before images/
  const patterns = [
    { regex: /(!\[[^\]]*\]\()\.{0,2}\/?images\//gi, replace: '$1/images/' },
    { regex: /(<img[^>]*\bsrc=["'])\.{0,2}\/?images\//gi, replace: '$1/images/' }
  ];
  let changed = content;
  patterns.forEach(p => {
    changed = changed.replace(p.regex, p.replace);
  });
  changed = changed.replace(/(?<!:)\/\/images\//g, '/images/');
  return changed;
}

function extractReferencedImages(content) {
  const refs = new Set();
  // Markdown ![]( /images/foo.png )
  const mdRegex = /!\[[^\]]*]\(\s*\/images\/([^)\s?#]+)[^)]*\)/gi;
  // HTML <img src="/images/foo.png">
  const imgRegex = /<img[^>]*\bsrc=["']\/images\/([^"'\s?#]+)[^"']*["']/gi;

  let m;
  while ((m = mdRegex.exec(content))) refs.add(m[1]);
  while ((m = imgRegex.exec(content))) refs.add(m[1]);
  return refs;
}

function buildLegacyIndex() {
  const idx = new Map();
  if (!fs.existsSync(LEGACY_DIR)) return idx;
  const files = walk(LEGACY_DIR);
  files.forEach(f => {
    const base = path.basename(f).toLowerCase();
    if (!idx.has(base)) idx.set(base, f);
  });
  return idx;
}

function main() {
    if (!fs.existsSync(CONTENT_DIR)) {
      console.error('No src/content directory found.');
      return;
    }
    ensureDir(PUBLIC_IMAGES_DIR);

    const mdFiles = walk(CONTENT_DIR, /\.md$/i);
    console.log(`Scanning ${mdFiles.length} markdown files...`);
    const allRefs = new Set();
    let modified = 0;

    mdFiles.forEach(file => {
      const orig = fs.readFileSync(file, 'utf8');
      const norm = normalizeContent(orig);
      if (norm !== orig) {
        fs.writeFileSync(file, norm, 'utf8');
        modified++;
        console.log(`Rewrote image paths: ${path.relative(ROOT, file)}`);
      }
      const refs = extractReferencedImages(norm);
      refs.forEach(r => allRefs.add(r));
    });

    console.log(`Modified files: ${modified}`);
    console.log(`Unique referenced images: ${allRefs.size}`);

    const legacyIdx = buildLegacyIndex();
    const unresolved = [];

    for (const img of allRefs) {
      const dest = path.join(PUBLIC_IMAGES_DIR, img);
      if (fs.existsSync(dest)) continue;
      const match = legacyIdx.get(img.toLowerCase());
      if (match) {
        try {
          fs.copyFileSync(match, dest);
          console.log(`Copied ${img} → public/images/${img}`);
        } catch (e) {
          console.warn(`Failed to copy ${img}: ${e.message}`);
          unresolved.push(img);
        }
      } else {
        unresolved.push(img);
      }
    }

    if (unresolved.length) {
      console.log('---- UNRESOLVED IMAGES ----');
      unresolved.forEach(i => console.log(i));
      console.log('Add the above to public/images/ manually.');
    } else {
      console.log('All referenced images present.');
    }

    console.log('Image fix complete.');
}

main();
