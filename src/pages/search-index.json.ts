import { getCollection } from 'astro:content';

interface SearchItem {
  c: string;
  slug: string;
  title: string;
  excerpt?: string;
  type?: string;
  ingredients?: string[];
}

function norm(v: unknown) {
  return typeof v === 'string' ? v : '';
}

export async function GET() {
  try {
    const games = await getCollection('games').catch(() => []);
    const cocktails = await getCollection('cocktails').catch(() => []);
    const shots = await getCollection('shots').catch(() => []);
    const activities = await getCollection('activities').catch(() => []);
    const posts = await getCollection('posts').catch(() => []);

    const index: SearchItem[] = [];

    for (const g of games) {
      index.push({
        c: 'games',
        slug: g.slug,
        title: norm(g.data.title),
        excerpt: norm(g.data.excerpt),
        type: norm(g.data.type)
      });
    }

    for (const c of cocktails) {
      index.push({
        c: 'drinks/cocktail-recipes',
        slug: c.slug,
        title: norm(c.data.title),
        excerpt: norm(c.data.excerpt),
        ingredients: Array.isArray(c.data.ingredients) ? c.data.ingredients.map(String) : undefined
      });
    }

    for (const s of shots) {
      index.push({
        c: 'drinks/shot-recipes',
        slug: s.slug,
        title: norm(s.data.title),
        excerpt: norm(s.data.excerpt),
        ingredients: Array.isArray(s.data.ingredients) ? s.data.ingredients.map(String) : undefined
      });
    }

    for (const a of activities) {
      index.push({
        c: 'activities',
        slug: a.slug,
        title: norm(a.data.title),
        excerpt: norm(a.data.excerpt),
        type: norm(a.data.difficulty)
      });
    }

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
