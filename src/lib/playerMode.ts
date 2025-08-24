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
