import { fileURLToPath } from 'node:url';
import { getCollection } from 'astro:content';
import { loadPublishedStories } from '../ask/corpus.mjs';
import { isPublished } from '../content.config';

const STATIC_PATHS = ['', 'writing/', 'poetry/', 'speaking/', 'about/', 'ask/', 'lore/', 'llms.txt', 'content-index.json'];
const storyRoot = fileURLToPath(new URL('../..', import.meta.url));

export async function GET(context) {
  const site = context.site ?? 'https://www.mlescaille.com';
  const posts = await getCollection('work', entry => isPublished(entry) && !entry.data.external);

  const staticUrls = STATIC_PATHS.map(p => `  <url><loc>${site}${p}</loc></url>`);
  const storyUrls = loadPublishedStories(storyRoot).map(story => `  <url><loc>${site}ask/stories/${story.slug}/</loc></url>`);
  const postUrls = posts.map(post => {
    const prefix = post.data.kind === 'poem' ? 'poetry' : 'writing';
    const lastmod = post.data.date.toISOString().slice(0, 10);
    return `  <url><loc>${site}${prefix}/${post.id}/</loc><lastmod>${lastmod}</lastmod></url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...storyUrls, ...postUrls].join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
