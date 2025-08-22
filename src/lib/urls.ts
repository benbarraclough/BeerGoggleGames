import { base } from './paths';

const FALLBACK_SITE = 'https://benbarraclough.github.io/BeerGoggleGames';

export function canonical(pathname: string, site?: string): string {
  const s = (site || FALLBACK_SITE).replace(/\/+$/,'');
  // pathname may already include base; ensure single leading slash
  const clean = '/' + pathname.replace(/^\/+/, '');
  return s + clean;
}

export function imageUrl(src: string): string {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  return base + 'images/' + src.replace(/^\/+/, '');
}

export function gameUrl(slug: string) {
  return base + 'games/' + slug.replace(/^\/+/, '') + '/';
}

export function cocktailUrl(slug: string) {
  return base + 'drinks/cocktail-recipes/' + slug.replace(/^\/+/, '') + '/';
}

export function shotUrl(slug: string) {
  return base + 'drinks/shot-recipes/' + slug.replace(/^\/+/, '') + '/';
}

export function postUrl(slug: string) {
  return base + 'blog/' + slug.replace(/^\/+/, '') + '/';
}

export function activityUrl(slug: string) {
  return base + 'activities/' + slug.replace(/^\/+/, '') + '/';
}
