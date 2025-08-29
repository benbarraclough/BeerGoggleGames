import { getCollection } from 'astro:content';

interface SearchItem {
  c: string;          // category path root (may include nested segment, e.g. 'games/coin')
  slug: string;
  title: string;
  excerpt?: string;
  type?: string;
  ingredients?: string[];
}

function norm(v: unknown) {
  return typeof v === 'string' ? v : '';
}

/**
 * Normalize the game type into a safe URL segment.
 * Currently just lowercases & trims. If you later have types like "Card Game"
 * you can extend this to replace spaces with hyphens.
 */
function typeSegment(raw: string) {
  const t = raw.trim().toLowerCase();
  // If you need slugging: return t.replace(/\s+/g, '-');
  return t;
}

export async function GET() {
  try {
    const games       = await getCollection('games').catch(() => []);
    const cocktails   = await getCollection('cocktails').catch(() => []);
    const shots       = await getCollection('shots').catch(() => []);
    const activities  = await getCollection('activities').catch(() => []);
    const posts       = await getCollection('posts').catch(() => []);

    const index: SearchItem[] = [];

    // Games: include type segment in 'c' so links become /games/<type>/<slug>/
    for (const g of games) {
      const rawType = norm(g.data.type);
      const t = typeSegment(rawType);
      index.push({
        c: t ? `games/${t}` : 'games',
        slug: g.slug,
        title: norm(g.data.title),
        excerpt: norm(g.data.excerpt),
        type: t
      });
    }

    // Cocktails
    for (const c of cocktails) {
      index.push({
        c: 'drinks/cocktail-recipes',
        slug: c.slug,
        title: norm(c.data.title),
        excerpt: norm(c.data.excerpt),
        ingredients: Array.isArray(c.data.ingredients)
          ? c.data.ingredients.map(String)
          : undefined
      });
    }

    // Shots
    for (const s of shots) {
      index.push({
        c: 'drinks/shot-recipes',
        slug: s.slug,
        title: norm(s.data.title),
        excerpt: norm(s.data.excerpt),
        ingredients: Array.isArray(s.data.ingredients)
          ? s.data.ingredients.map(String)
          : undefined
      });
    }

    // Activities
    for (const a of activities) {
      index.push({
        c: 'activities',
        slug: a.slug,
        title: norm(a.data.title),
        excerpt: norm(a.data.excerpt),
        type: norm(a.data.difficulty)
      });
    }

    // Blog posts (skip drafts)
    for (const p of posts) {
      if (p.data.draft) continue;
      index.push({
        c: 'blog',
        slug: p.slug,
        title: norm(p.data.title),
        excerpt: norm(p.data.excerpt)
      });
    }

    return new Response(JSON.stringify(index), {
      headers: {
        'Content-Type': 'application/json',
        // Keep cache short; adjust if you want faster propagation or longer caching
        'Cache-Control': 'public, max-age=900'
      }
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'failed', detail: String(e?.message || e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
