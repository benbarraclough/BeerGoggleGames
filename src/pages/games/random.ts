import { getCollection } from 'astro:content';

export async function GET() {
  const games = await getCollection('games').catch(()=>[]);
  if (!games.length) return new Response('No games', { status: 404 });
  const pick = games[Math.floor(Math.random() * games.length)];
  // Ensure trailing slash for canonical consistency
  const base = import.meta.env.BASE_URL || '/';
  return Response.redirect(`${base}games/${pick.slug}/`, 302);
}
