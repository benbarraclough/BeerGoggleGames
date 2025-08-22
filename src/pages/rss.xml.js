import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  // Primary collection is posts
  const posts = await getCollection('posts').catch(() => []);
  const site = 'https://benbarraclough.github.io/BeerGoggleGames';

  const items = posts
    .filter(p => p.data?.title)
    .sort((a, b) => {
      const ad = new Date(a.data.date || 0).getTime();
      const bd = new Date(b.data.date || 0).getTime();
      return bd - ad;
    })
    .slice(0, 50);

  const escape = (s) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Beer Goggle Games – Posts</title>
<link>${site}/</link>
<description>Latest drinking game & cocktail blog posts.</description>
<language>en</language>
${items
  .map((p) => {
    const url = `${site}/blog/${p.slug}/`;
    const title = escape(p.data.title);
    const desc = escape(p.data.excerpt || '');
    const pubDate = p.data.date
      ? new Date(p.data.date).toUTCString()
      : '';
    return `<item>
<title><![CDATA[${title}]]></title>
<link>${url}</link>
<guid>${url}</guid>
${pubDate && `<pubDate>${pubDate}</pubDate>`}
<description><![CDATA[${desc}]]></description>
</item>`;
  })
  .join('\n')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
