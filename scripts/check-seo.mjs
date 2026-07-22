import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve('dist');
const SITE = 'https://www.mlescaille.com/';
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return files.flat();
}

function capture(html, pattern) {
  return html.match(pattern)?.[1]?.trim();
}

const htmlFiles = (await walk(DIST)).filter(file => file.endsWith('.html'));
const canonicalPages = new Map();
const titles = new Map();

for (const file of htmlFiles) {
  const relative = path.relative(DIST, file);
  const html = await readFile(file, 'utf8');

  // Astro's static fallback redirects use a meta refresh page. Hosting-level
  // rules turn these into 301s on Vercel and Netlify.
  if (/http-equiv=["']refresh["']/i.test(html)) continue;

  const title = capture(html, /<title>([^<]+)<\/title>/i);
  const description = capture(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const canonical = capture(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const robots = capture(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);

  if (!title) errors.push(`${relative}: missing title`);
  if (!description) errors.push(`${relative}: missing meta description`);
  if (!canonical?.startsWith(SITE)) errors.push(`${relative}: missing or invalid canonical URL`);
  if (!robots || /noindex/i.test(robots)) errors.push(`${relative}: page is not explicitly indexable`);
  if (!/<h1(?:\s|>)/i.test(html)) errors.push(`${relative}: missing h1`);

  if (title) {
    if (titles.has(title)) errors.push(`${relative}: duplicate title also used by ${titles.get(title)}`);
    titles.set(title, relative);
  }
  if (canonical) {
    if (canonicalPages.has(canonical)) errors.push(`${relative}: duplicate canonical also used by ${canonicalPages.get(canonical)}`);
    canonicalPages.set(canonical, relative);
  }

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch {
      errors.push(`${relative}: invalid JSON-LD`);
    }
  }

  if (/\/(writing|poetry)\/.+\/index\.html$/.test(`/${relative}`) && !/<meta\s+property=["']og:type["']\s+content=["']article["']/i.test(html)) {
    errors.push(`${relative}: content page is missing og:type=article`);
  }
}

const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));

for (const url of canonicalPages.keys()) {
  if (!sitemapUrls.has(url)) errors.push(`sitemap.xml: missing ${url}`);
}
for (const url of sitemapUrls) {
  if (!canonicalPages.has(url)) errors.push(`sitemap.xml: non-canonical or non-HTML URL ${url}`);
}
for (const machineUrl of [`${SITE}llms.txt`, `${SITE}content-index.json`]) {
  if (sitemapUrls.has(machineUrl)) errors.push(`sitemap.xml: machine-readable URL should not be submitted for indexing: ${machineUrl}`);
}

const robotsTxt = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
if (!robotsTxt.includes(`Sitemap: ${SITE}sitemap.xml`)) {
  errors.push('robots.txt: missing canonical sitemap URL');
}
if (/Disallow:\s*\/$/m.test(robotsTxt)) {
  errors.push('robots.txt: root crawling is blocked');
}

if (errors.length) {
  console.error(`SEO check failed with ${errors.length} issue(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`SEO check passed: ${canonicalPages.size} indexable HTML pages, ${sitemapUrls.size} canonical sitemap URLs.`);
