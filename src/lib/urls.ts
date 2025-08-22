import { base } from './paths';

const FALLBACK_SITE = 'https://benbarraclough.github.io/BeerGoggleGames';

// Returns a canonical absolute URL.
// - pathname should be Astro.url.pathname (already includes base).
// - site may be a string or URL (Astro.site is a URL object at build time).
export function canonical(pathname: string, site?: string | URL): string {
  const p = pathname.startsWith('/') ? pathname : '/' + pathname;
  if (site) {
    const u = new URL(String(site));
    // Use origin + the runtime pathname (which already includes base)
    return u.origin + p;
  }
  // Fallback: strip trailing slashes from fallback site path part? We only need origin; fallback already includes base path,
  // so to avoid double-including base, we take origin of fallback and append pathname.
  const f = new URL(FALLBACK_SITE);
  return f.origin + p;
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
