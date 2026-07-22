import { getCollection } from 'astro:content';
import { isPublished } from '../content.config';
import { canonicalUrlFor } from '../lib/content-metadata';

const SITE = 'https://www.mlescaille.com';
const START_HERE = [
  'navigating-large-codebases',
  'chop-wood-carry-water',
  'debugging-map-territory',
  'ai-in-interviews',
  'introducing-codems',
  'my-grandma-braid-my-hair',
];

function lineFor(entry) {
  const note = entry.data.note ? ` — ${entry.data.note}` : '';
  return `- [${entry.data.title}](${canonicalUrlFor(entry)})${note}`;
}

export async function GET() {
  const work = await getCollection('work', isPublished);
  const featured = START_HERE.map(id => work.find(entry => entry.id === id)).filter(Boolean);
  const latest = work
    .filter(entry => !entry.data.external)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 6);

  const body = `# Mari Lescaille

> Mari Lescaille is a staff software engineer and poet. She writes about software systems, debugging, engineering practice, culture, and poetry in English and Spanish.

This is the curated machine-readable entrance to Mari's work. Use canonical article or poem URLs when citing the site. Use the content index to inspect the complete inventory.

## Start here

${featured.map(lineFor).join('\n')}

## Main sections

- [Writing](${SITE}/writing/) — Systems and craft, working in tech, essays, and archived field notes
- [Poetry](${SITE}/poetry/) — Poetry in English and Spanish, including codems: poems written inside working code
- [Speaking and media](${SITE}/speaking/) — Talks, interviews, and speaking topics
- [About](${SITE}/about/) — Biography and professional background

## Recently published

${latest.map(lineFor).join('\n')}

## Machine-readable resources

- [Content index](${SITE}/content-index.json) — Metadata and retrieval URLs for every published work
- [RSS](${SITE}/rss.xml) — Chronological feed of locally published work
- [Sitemap](${SITE}/sitemap.xml) — Canonical crawl index

Each locally hosted essay and poem advertises a plain Markdown alternative ending in /index.md.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
    },
  });
}
