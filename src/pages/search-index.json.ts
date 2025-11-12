import { getCollection } from 'astro:content';

interface SearchItem {
  c: string; // path root or page path (e.g., 'games', 'drinks', 'extras/dice', 'contact')
  slug?: string; // optional leaf (for detail pages). If empty/undefined, link is just /{c}/
  title: string;
  excerpt?: string;
  type?: string; // e.g. game type, drink type, difficulty, etc.
  ingredients?: string[];
}

function norm(v: unknown) {
  return typeof v === 'string' ? v : '';
}

function leafFrom(idOrSlug: string) {
  const parts = (idOrSlug || '').split('/');
  return parts[parts.length - 1] || idOrSlug;
}

export async function GET() {
  try {
    const games = await getCollection('games').catch(() => []);
    const drinks = await getCollection('drinks').catch(() => []);
    const activities = await getCollection('activities').catch(() => []);
    const posts = await getCollection('posts').catch(() => []);

    const index: SearchItem[] = [];

    // Games: flat routes /games/<leaf>/; show type in "type", group label should be just "games"
    for (const g of games) {
      const leaf = leafFrom(g.slug ?? g.id);
      index.push({
        c: 'games',
        slug: leaf,
        title: norm(g.data.title),
        excerpt: norm(g.data.excerpt),
        type: norm(g.data.type),
      });
    }

    // Drinks: flat routes /drinks/<leaf>/
    for (const d of drinks) {
      const leaf = leafFrom(d.slug ?? d.id);
      index.push({
        c: 'drinks',
        slug: leaf,
        title: norm(d.data.title),
        excerpt: norm(d.data.excerpt),
        type: norm(d.data.drinkType),
      });
    }

    // Activities (under Extras)
    for (const a of activities) {
      index.push({
        c: 'extras/activities',
        slug: a.slug,
        title: norm(a.data.title),
        excerpt: norm(a.data.excerpt),
        type: norm(a.data.difficulty),
      });
    }

    // Blog posts (under Extras, skip drafts)
    for (const p of posts) {
      if (p.data.draft) continue;
      index.push({
        c: 'extras/blog',
        slug: p.slug,
        title: norm(p.data.title),
        excerpt: norm(p.data.excerpt),
      });
    }

    // Static hub pages and key extras/tools (no slug)
    const staticPages: SearchItem[] = [
      { c: 'games', title: 'Games', excerpt: 'All drinking games, A–Z.' },
      { c: 'drinks', title: 'Drinks', excerpt: 'All drink recipes, A–Z.' },
      { c: 'extras', title: 'Extras', excerpt: 'Tools and extras hub.' },
      { c: 'extras/dice', title: 'Dice Roller', excerpt: 'Roll one or more dice on screen.' },
      { c: 'extras/coin-flip', title: 'Coin Flip', excerpt: 'Flip a coin with simple animation.' },
      {
        c: 'extras/wheel-of-fortune',
        title: 'Wheel Of Fortune',
        excerpt: 'Spin a wheel to choose categories or games.',
      },
      { c: 'extras/forfeits', title: 'Forfeits', excerpt: 'Creative punishments & challenges.' },
      { c: 'extras/glossary', title: 'Glossary', excerpt: 'Drinking terms and definitions.' },
      { c: 'extras/activities', title: 'Activities', excerpt: 'Party & social activities.' },
      { c: 'extras/blog', title: 'Blog', excerpt: 'Guides, announcements & ideas.' },
      { c: 'contact', title: 'Contact', excerpt: 'Send feedback or suggestions.' },
      { c: 'about', title: 'About', excerpt: 'About BeerGoggleGames.' },
    ];
    index.push(...staticPages);

    return new Response(JSON.stringify(index), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'failed', detail: String(e?.message || e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
