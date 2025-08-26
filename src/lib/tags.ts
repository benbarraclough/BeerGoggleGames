export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')   // remove punctuation
    .replace(/\s+/g, '-')           // spaces -> hyphen
    .replace(/-+/g, '-');           // collapse duplicates
}

export function uniqueTagSlugs(tagArrays: (string[] | undefined)[]): { slug: string; label: string }[] {
  const map = new Map<string, string>();
  for (const arr of tagArrays) {
    if (!arr) continue;
    for (const t of arr) {
      const s = tagSlug(t);
      if (!map.has(s)) map.set(s, t);
    }
  }
  return Array.from(map.entries()).map(([slug, label]) => ({ slug, label }));
}
