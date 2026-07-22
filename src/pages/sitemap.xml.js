import { getCollection } from 'astro:content';
import { isPublished } from '../content.config';

// Only canonical HTML pages belong here. Machine-readable alternatives are
// discoverable from HTML and robots.txt, but should not compete in search.
const STATIC_PATHS = ['', 'writing/', 'poetry/', 'speaking/', 'about/'];

export async function GET(context) {
  const site = context.site ?? 'https://www.mlescaille.com';
  const posts = await getCollection('work', entry => isPublished(entry) && !entry.data.external);

  const staticUrls = STATIC_PATHS.map(p => `  <url><loc>${site}${p}</loc></url>`);
  const postUrls = posts.map(post => {
    const prefix = post.data.kind === 'poem' ? 'poetry' : 'writing';
    const lastmod = (post.data.updatedAt ?? post.data.date).toISOString().slice(0, 10);
    return `  <url><loc>${site}${prefix}/${post.id}/</loc><lastmod>${lastmod}</lastmod></url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...postUrls].join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
