// Updated to prefer 'format' (new field) but remain backward compatible with 'players'

function resolveFormat(value?: string) {
  return (value || '').toLowerCase();
}

export function playerModeClass(raw?: string) {
  const v = resolveFormat(raw);
  if (!v) return 'mode-pill';
  if (v.includes('team')) return 'mode-pill mode-pill-team';
  if (v.includes('pair')) return 'mode-pill mode-pill-pairs';
  if (v.includes('solo') || v.includes('single')) return 'mode-pill mode-pill-solo';
  return 'mode-pill';
}

export function playerModeLabel(raw?: string) {
  const v = resolveFormat(raw);
  if (!v) return 'Unknown';
  if (v.includes('team')) return 'Team';
  if (v.includes('pair')) return 'Pairs';
  if (v.includes('solo') || v.includes('single')) return 'Solo';
  return raw || 'Unknown';
}

export function playerModeSlug(raw?: string) {
  const v = resolveFormat(raw).trim();
  if (!v) return 'unknown';
  if (v.includes('team')) return 'team';
  if (v.includes('pair')) return 'pairs';
  if (v.includes('solo') || v.includes('single')) return 'solo';
  return v
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-') || 'unknown';
}
