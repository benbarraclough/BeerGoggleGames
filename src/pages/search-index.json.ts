---
import { getCollection } from 'astro:content';

export async function GET() {
  const collections = ['games','cocktails','shots','activities','posts'];
  const entries = [];

  for (const c of collections) {
    try {
      const items = await getCollection(c);
      for (const it of items) {
        entries.push({
          c,
          slug: it.slug,
          title: it.data.title,
          excerpt: it.data.excerpt || '',
          type: it.data.type || '',
          ingredients: it.data.ingredients || it.data.Ingredients || [],
        });
      }
    } catch {
      // collection may not exist; ignore
    }
  }

  return new Response(JSON.stringify(entries), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
