import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAskIndex } from '../src/ask/corpus.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const index = await buildAskIndex({ root });
const out = join(root, 'src/generated/ask-index.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(index));

const counts = index.chunks.reduce((map, chunk) => {
  map[chunk.source] = (map[chunk.source] || 0) + 1;
  return map;
}, {});
const repos = index.github.map(entry => `${entry.repo} ${entry.refreshed ? `refreshed ${entry.commit?.slice(0, 7)}` : 'snapshot'}`).join(', ');
console.log(`Ask index: ${index.chunks.length} chunks ${JSON.stringify(counts)}${repos ? ` (${repos})` : ''}`);
