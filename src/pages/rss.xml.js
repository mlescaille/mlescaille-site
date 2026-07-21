import { getCollection } from 'astro:content';
import { isPublished } from '../content.config';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET(context) {
  const site = context.site ?? 'https://www.mlescaille.com';
  const posts = (await getCollection('work', entry => isPublished(entry) && !entry.data.external))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 40);

  const items = posts.map(post => {
    const prefix = post.data.kind === 'poem' ? 'poetry' : 'writing';
    return `    <item>
      <title>${esc(post.data.title)}</title>
      <link>${site}${prefix}/${post.id}/</link>
      <guid isPermaLink="true">${site}${prefix}/${post.id}/</guid>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
      <category>${esc(post.data.kind)}</category>${post.data.note ? `
      <description>${esc(post.data.note)}</description>` : ''}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mari Lescaille</title>
    <link>${site}</link>
    <description>Essays on systems, working in tech, and the writing life — plus poems in two languages.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
