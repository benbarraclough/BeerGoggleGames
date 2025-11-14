import fs from 'node:fs';

const imagesDir = new URL('../../public/images/', import.meta.url);

export function candidateNames(name: string): string[] {
  const original = name;
  const noHyphen = name.replace(/-/g, '');
  const andToAmp = name.replace(/-and-/g, '&').replace(/-/g, '');
  const removeOf = name.replace(/-of-/g, '-');
  const ofNoHyphen = removeOf.replace(/-/g, '');
  const m = name.match(/^(\d+-\d+)-(.*)$/); // e.g. 7-11-doubles -> 7-11doubles
  const numericJoin = m ? m[1] + m[2].replace(/-/g, '') : '';
  const list = [original, noHyphen, andToAmp, ofNoHyphen, numericJoin]
    .filter(Boolean)
    .map(n => `${n}.webp`);
  return Array.from(new Set(list));
}

export function pickImageFile(leaf: string): string {
  const list = candidateNames(leaf);
  for (const f of list) {
    if (fs.existsSync(new URL(f, imagesDir))) return f;
  }
  return list[0];
}
