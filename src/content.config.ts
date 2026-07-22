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
    description: z.string().optional(), // optional longer machine-readable summary
    lang: z.enum(['en', 'es']).default('en'),
    topics: z.array(z.string()).default([]),
    updatedAt: z.coerce.date().optional(),
    status: z.enum(['current', 'archived']).optional(),
    author: z.string().default('Mari Lescaille'),
    canonicalUrl: z.string().url().optional(),
    external: z.string().url().optional(), // set for Medium/YouTube pieces — list links out, no page built
    featured: z.boolean().default(false),  // appears in homepage "obra"
    // Writing-page shelf: systems & craft / working in tech / essays / field notes & archive
    shelf: z.enum(['systems', 'tech', 'essays', 'archive']).default('essays'),
    draft: z.boolean().default(false)
  })
});

export const collections = { work };

// `date` doubles as the publish time — set it in the future to schedule a post.
// It stays out of collections until that moment passes at build time.
export const isPublished = ({ data }) => !data.draft && data.date <= new Date();
