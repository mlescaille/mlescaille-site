import { getCollection } from 'astro:content';
import { isPublished } from '../../../content.config';
import { markdownDocument } from '../../../lib/content-metadata';

export async function getStaticPaths() {
  const entries = await getCollection('work', entry =>
    isPublished(entry) && !entry.data.external && entry.data.kind === 'poem'
  );
  return entries.map(entry => ({ params: { id: entry.id }, props: { entry } }));
}

export function GET({ props }) {
  return new Response(markdownDocument(props.entry), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
    },
  });
}
