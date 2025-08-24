import { getCollection } from 'astro:content';

export async function GET() {
  const games = await getCollection('games').catch(()=>[]);
  if (!games.length) return new Response('No games', { status: 404 });
  const pick = games[Math.floor(Math.random() * games.length)];
  const parts = pick.slug.split('/');
  // Expect slug like "dice/666" or "pong/beer-pong"
  let type = pick.data.type || parts[0];
  let shortSlug = parts[parts.length -1];
  const base = import.meta.env.BASE_URL || '/';
  return Response.redirect(`${base}games/${type}/${shortSlug}/`, 302);
}
