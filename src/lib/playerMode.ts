export function playerModeClass(value?: string) {
  if (!value) return 'mode-pill';
  const v = value.toLowerCase();
  if (v.includes('team')) return 'mode-pill mode-pill-team';
  if (v.includes('pair')) return 'mode-pill mode-pill-pairs';
  if (v.includes('solo') || v.includes('single')) return 'mode-pill mode-pill-solo';
  return 'mode-pill';
}

export function playerModeLabel(value?: string) {
  if (!value) return 'Unknown';
  const v = value.toLowerCase();
  if (v.includes('team')) return 'Team';
  if (v.includes('pair')) return 'Pairs';
  if (v.includes('solo') || v.includes('single')) return 'Solo';
  return value;
}

/**
 * Normalized slug used in URLs for player mode pages.
 * Maps common variants to canonical slugs.
 */
export function playerModeSlug(value?: string) {
  if (!value) return 'unknown';
  const v = value.toLowerCase().trim();
  if (v.includes('team')) return 'team';
  if (v.includes('pair')) return 'pairs';
  if (v.includes('solo') || v.includes('single')) return 'solo';
  // fallback: letters/numbers only, hyphenate spaces
  return v
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    || 'unknown';
}
