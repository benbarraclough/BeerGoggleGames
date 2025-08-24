import { getCollection } from 'astro:content';

// Helper to build absolute URL safely
function buildAbsolute(path: string) {
  const site = (import.meta as any).env?.SITE as string | undefined;
  if (site) {
    try {
      return new URL(path, site).href;
    } catch {
      // fall through
    }
  }
  // Fallback: explicit GitHub Pages origin (adjust if you change org/repo)
  return 'https://benbarraclough.github.io' + path.replace(/^\/+/, '/');
}

export async function GET() {
  const games = await getCollection('games').catch(() => []);
  if (!games.length) {
    return new Response('No games available', { status: 404 });
  }
  const pick = games[Math.floor(Math.random() * games.length)];
  // Expect slug pattern like "dice/666"
  const parts = pick.slug.split('/');
  const type = pick.data.type || parts[0] || 'misc';
  const shortSlug = parts[parts.length - 1];
  const base = (import.meta as any).env?.BASE_URL || '/';
  const relPath = `${base}games/${type}/${shortSlug}/`;
  const location = buildAbsolute(relPath);
  return new Response(null, {
    status: 302,
    headers: { Location: location }
  });
}
