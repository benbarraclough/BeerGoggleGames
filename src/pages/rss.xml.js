import { getCollection } from 'astro:content';
import { withBase } from '../lib/paths'; // adjust path if needed

export const prerender = true;

function esc(s = '') {
  return s
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

export async function GET() {
  const site =
    import.meta.env.SITE?.replace(/\/+$/,'') ||
    'https://benbarraclough.github.io/BeerGoggleGames';

  const posts = await getCollection('posts').catch(() => []);
  const items = posts
    .filter(p => p.data?.title)
    .sort((a,b) => new Date(b.data.date||0).getTime() - new Date(a.data.date||0).getTime())
    .slice(0, 50);

  const lastBuildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Beer Goggle Games – Posts</title>
  <link>${site}/</link>
  <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
  <description>Latest drinking game &amp; cocktail blog posts.</description>
  <language>en</language>
  <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items.map(p => {
  const url = `${site}/blog/${p.slug}/`;
  const title = p.data.title;
  const desc = p.data.excerpt || '';
  const pubDate = p.data.date ? new Date(p.data.date).toUTCString() : '';
  const categories = (p.data.tags || [])
    .map(t => `<category>${esc(t)}</category>`)
    .join('');
  return `  <item>
    <title><![CDATA[${title}]]></title>
    <link>${url}</link>
    <guid>${url}</guid>
    ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
    ${categories}
    <description><![CDATA[${desc}]]></description>
  </item>`;
}).join('\n')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900'  // 15 min (harmless when prerendered)
    }
  });
}
