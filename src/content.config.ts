import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One collection for everything — essays, poems, explorables, talks.
// The mixed "obra" list on the homepage is this collection, sorted by date.
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    kind: z.enum(['essay', 'poem', 'explorable', 'talk', 'audio', 'code · poems', 'convention']),
    date: z.coerce.date(),
    note: z.string().optional(),        // one-line description for lists
    lang: z.enum(['en', 'es']).default('en'),
    external: z.string().url().optional(), // set for Medium/YouTube pieces — list links out, no page built
    featured: z.boolean().default(false),  // appears in homepage "obra"
    draft: z.boolean().default(false)
  })
});

export const collections = { work };
