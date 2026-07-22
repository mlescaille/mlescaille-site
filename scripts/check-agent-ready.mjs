import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const read = path => readFileSync(new URL(path, dist), 'utf8');

assert.ok(existsSync(dist), 'Run npm run build before this check.');

const robots = read('robots.txt');
assert.match(robots, /Content-Signal:\s*search=yes, ai-input=yes, ai-train=no/i);
assert.match(robots, /Sitemap:\s*https:\/\/www\.mlescaille\.com\/sitemap\.xml/i);

const llms = read('llms.txt');
assert.match(llms, /^# Mari Lescaille/m);
assert.match(llms, /\/content-index\.json/);
assert.ok((llms.match(/^-/gm) ?? []).length < 30, 'llms.txt should remain curated.');

const sitemap = read('sitemap.xml');
assert.doesNotMatch(sitemap, /\/llms\.txt/);
assert.doesNotMatch(sitemap, /\/content-index\.json/);

const homepage = read('index.html');
assert.match(homepage, /<link rel="alternate" type="text\/plain"[^>]+\/llms\.txt/);

const index = JSON.parse(read('content-index.json'));
const required = [
  'title', 'url', 'markdownUrl', 'contentType', 'section', 'topics', 'language',
  'publishedAt', 'updatedAt', 'status', 'author', 'description',
];

for (const entry of index) {
  for (const field of required) {
    assert.ok(Object.hasOwn(entry, field), `${entry.title} is missing ${field}.`);
  }

  if (!entry.markdownUrl) continue;
  const path = new URL(entry.url).pathname;
  const markdownPath = new URL(entry.markdownUrl).pathname;
  const html = read(join(path.replace(/^\/+/, ''), 'index.html'));

  assert.ok(existsSync(new URL(`.${markdownPath}`, dist)), `Missing ${markdownPath}.`);
  assert.ok(html.includes('type="text/markdown"'), `Missing Markdown alternate on ${path}.`);
  assert.ok(
    html.includes(entry.contentType === 'poem' || entry.contentType === 'codem' ? 'CreativeWork' : 'BlogPosting'),
    `Missing content-specific structured data on ${path}.`,
  );
}

console.log(`Agent-ready checks passed for ${index.length} published works.`);
