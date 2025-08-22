import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  // Adjust: if your blog collection is 'posts' use 'posts'; if it's 'blog' swap below.
  const posts = await getCollection('posts').catch(async () => {
    try { return await getCollection('blog'); } catch { return []; }
  });

  const site = 'https://benbarraclough.github.io/BeerGoggleGames';
  const items = posts
    .filter(p => p.data?.title)
    .sort((a,b)=> (b.data.date || 0) > (a.data.date || 0) ? 1 : -1)
    .slice(0,50);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Beer Goggle Games – Blog</title>
<link>${site}/</link>
<description>Latest posts</description>
<language>en</language>
${items.map(p => {
  const url = `${site}/blog/${p.slug}/`;
  const title = p.data.title;
  const desc = p.data.excerpt || '';
  const pubDate = p.data.date ? new Date(p.data.date).toUTCString() : '';
  return `<item>
<title><![CDATA[${title}]]></title>
<link>${url}</link>
<guid>${url}</guid>
${pubDate && `<pubDate>${pubDate}</pubDate>`}
<description><![CDATA[${desc}]]></description>
</item>`;
}).join('\n')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' }
  });
}
