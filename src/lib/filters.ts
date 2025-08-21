/**
 * Filters out legacy noise pages (e.g. the scraped 'beergogglegames' placeholder).
 * You can add more conditions here if you discover other junk slugs.
 */
export function excludeLegacyNoise(items) {
  return items.filter(item => {
    const slug = (item.slug ?? item.id).split('/').pop();
    if (!slug) return false;
    if (slug === 'beergogglegames') return false;
    return true;
  });
}

/**
 * (Optional) Normalize a slug if you need to standardize elsewhere.
 */
export function normalizeSlug(s) {
  return (s || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}
