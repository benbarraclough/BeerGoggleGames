const raw = import.meta.env.BASE_URL || '/';

function normalizeBase(b: string) {
  if (!b) return '/';
  b = b.trim();
  if (!b.startsWith('/')) b = '/' + b;
  b = b.replace(/\/+$/,'');
  return b === '' ? '/' : b + '/';
}

export const base = normalizeBase(raw);

export function withBase(path = ''): string {
  const p = path.replace(/^\/+/, '');
  return base + p;
}
