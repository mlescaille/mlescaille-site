import { getCollection } from 'astro:content';
import { isPublished } from '../content.config';
import { normalizedMetadata } from '../lib/content-metadata';

export async function GET() {
  const entries = (await getCollection('work', isPublished))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map(normalizedMetadata);

  return new Response(JSON.stringify(entries, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
    },
  });
}
