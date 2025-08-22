import { base } from './paths';

export function canonical(pathname: string): string {
  // Ensure no double slash
  const clean = pathname.startsWith('/') ? pathname : '/' + pathname;
  return `https://benbarraclough.github.io${base.replace(/(^\/|\/$)/g,'')}${clean}`.replace(/([^:]\/)\/+/g,'$1');
}

export function imageUrl(src: string): string {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  return base + 'images/' + src.replace(/^\/+/, '');
}

export function gameUrl(slug: string) {
  return `${base}games/${slug.replace(/^\/+/, '')}/`;
}

export function cocktailUrl(slug: string) {
  return `${base}drinks/cocktail-recipes/${slug.replace(/^\/+/, '')}/`;
}
