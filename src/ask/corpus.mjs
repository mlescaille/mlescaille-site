import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { chunkPlain, extractAstroText, isPublished, markdownToPlain, parseFrontmatter } from './text.mjs';

export const SITE = 'https://www.mlescaille.com';

export const ENTRY_POINTS = [
  { title: 'Writing', url: `${SITE}/writing/` },
  { title: 'Poetry', url: `${SITE}/poetry/` },
  { title: 'About', url: `${SITE}/about/` },
  { title: 'Speaking and media', url: `${SITE}/speaking/` },
  { title: 'Lore', url: `${SITE}/lore/` },
  { title: 'Lore repository', url: 'https://github.com/mlescaille/lore' },
  { title: 'authz-agent-evals repository', url: 'https://github.com/mlescaille/authz-agent-evals' },
];

// Hand-authored pages. The writing and poetry indexes are generated from the
// collection, so indexing them would duplicate titles and pick up template code.
const PAGE_SOURCES = [
  { file: 'src/pages/index.astro', url: `${SITE}/`, title: 'Home' },
  { file: 'src/pages/about.astro', url: `${SITE}/about/`, title: 'About' },
  { file: 'src/pages/speaking/index.astro', url: `${SITE}/speaking/`, title: 'Speaking and media' },
];

const REPOS = [
  { owner: 'mlescaille', repo: 'lore' },
  { owner: 'mlescaille', repo: 'authz-agent-evals' },
];

const SECRET_LINE = /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|api[_-]?key\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}/i;

export function isDocPath(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return false;
  if (!normalized.toLowerCase().endsWith('.md')) return false;
  const base = normalized.split('/').pop();
  if (/^(changelog|code_of_conduct|license)\.md$/i.test(base)) return false;
  if (!normalized.includes('/')) return /^(readme|contributing|architecture|design)\.md$/i.test(base);
  return normalized.startsWith('docs/') || normalized.startsWith('doc/');
}

export function isApprovedStory(data, now = new Date()) {
  if (data.draft === true) return false;
  if (!data.title) return false;
  if (!data.date) return true;
  const date = new Date(data.date);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= now.getTime();
}

function dropLeadingTitle(text, title) {
  const parts = text.split(/\n{2,}/);
  if (parts.length > 1 && parts[0].trim().toLowerCase() === title.trim().toLowerCase()) {
    return parts.slice(1).join('\n\n');
  }
  return text;
}

function walk(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else found.push(path);
  }
  return found;
}

function inside(root, target) {
  const prefix = root.endsWith(sep) ? root : root + sep;
  return target === root || target.startsWith(prefix);
}

function workUrl(data, id) {
  if (typeof data.external === 'string' && data.external) return data.external;
  const section = data.kind === 'poem' ? 'poetry' : 'writing';
  return `${SITE}/${section}/${id}/`;
}

function chunksForDocument({ id, source, title, url, text }) {
  return chunkPlain(text).map((part, index) => ({
    id: `${source}:${id}:${index}`,
    source,
    title,
    url,
    text: part,
  }));
}

export function loadWorkChunks(root, now = new Date()) {
  const dir = join(root, 'src/content/work');
  const chunks = [];
  for (const path of walk(dir)) {
    if (!path.endsWith('.md')) continue;
    const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'));
    if (!isPublished(data, now)) continue;
    const id = relative(dir, path).replace(/\.md$/, '').split(sep).join('/');
    const plain = markdownToPlain(body);
    const text = [data.note, plain].filter(Boolean).join('\n\n') || data.title;
    chunks.push(...chunksForDocument({
      id,
      source: 'writing',
      title: data.title,
      url: workUrl(data, id),
      text,
    }));
  }
  return chunks;
}

export function loadPageChunks(root) {
  const chunks = [];
  for (const page of PAGE_SOURCES) {
    const path = join(root, page.file);
    if (!existsSync(path)) continue;
    const text = markdownToPlain(extractAstroText(readFileSync(path, 'utf8')));
    chunks.push(...chunksForDocument({
      id: page.file,
      source: 'writing',
      title: page.title,
      url: page.url,
      text,
    }));
  }
  return chunks;
}

export function loadStoryChunks(root, now = new Date()) {
  return loadPublishedStories(root, now).flatMap(story => chunksForDocument({
    id: story.slug,
    source: 'story',
    title: story.title,
    url: story.url,
    text: [story.note, story.plain].filter(Boolean).join('\n\n'),
  }));
}

export function loadPublishedStories(root, now = new Date()) {
  const dir = join(root, 'src/content/ask/stories');
  const stories = [];
  for (const path of walk(dir)) {
    const base = path.split(sep).pop();
    if (!base.toLowerCase().endsWith('.md')) continue;
    if (/^readme\.md$/i.test(base) || base.startsWith('_')) continue;
    const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'));
    if (!isApprovedStory(data, now)) continue;
    const slug = relative(dir, path).replace(/\.md$/, '').split(sep).join('/');
    const plain = markdownToPlain(body);
    const paragraphs = plain.split(/\n{2,}/).map(paragraph => paragraph.trim()).filter(Boolean);
    const url = typeof data.url === 'string' && data.url
      ? data.url
      : `${SITE}/ask/stories/${slug}/`;
    stories.push({
      slug,
      title: data.title,
      note: data.note || '',
      url,
      plain,
      paragraphs,
      description: (data.note || paragraphs[0] || data.title).slice(0, 180),
    });
  }
  return stories.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function loadCodeChunks(root) {
  const base = join(root, 'src/content/ask/sources');
  if (!existsSync(base)) return [];
  const chunks = [];
  for (const name of readdirSync(base)) {
    const dir = join(base, name);
    if (!statSync(dir).isDirectory()) continue;
    const metaPath = join(dir, '_snapshot.json');
    const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
    const repo = meta.repo || `mlescaille/${name}`;
    const commit = meta.commit || 'main';
    const files = Array.isArray(meta.files) && meta.files.length
      ? meta.files
      : walk(dir).map(path => relative(dir, path)).filter(isDocPath);
    for (const file of files) {
      if (!isDocPath(file)) continue;
      const path = join(dir, file);
      if (!inside(dir, path) || !existsSync(path)) continue;
      const raw = readFileSync(path, 'utf8');
      if (SECRET_LINE.test(raw)) continue;
      const repoName = repo.split('/').pop() || name;
      const label = repoName === 'lore' ? 'Lore' : repoName;
      const title = file.toLowerCase() === 'readme.md' ? `${label} README` : `${label} / ${file}`;
      const text = dropLeadingTitle(markdownToPlain(raw), label);
      chunks.push(...chunksForDocument({
        id: `${name}/${file}`,
        source: 'code',
        title,
        url: `https://github.com/${repo}/blob/${commit}/${file}`,
        text,
      }));
    }
  }
  return chunks;
}

export async function refreshGithubSources({ root, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const results = [];
  for (const repo of REPOS) {
    const dest = join(root, 'src/content/ask/sources', repo.repo);
    try {
      const snapshot = await fetchRepoDocs({ ...repo, fetchImpl, timeoutMs });
      writeSnapshot(dest, snapshot);
      results.push({
        repo: `${repo.owner}/${repo.repo}`,
        commit: snapshot.commit,
        refreshed: true,
        files: snapshot.files.length,
      });
    } catch (error) {
      const meta = readMeta(dest);
      results.push({
        repo: `${repo.owner}/${repo.repo}`,
        commit: meta?.commit ?? null,
        refreshed: false,
        files: meta?.files?.length ?? 0,
        reason: error.code || error.name || 'Error',
      });
    }
  }
  return results;
}

async function fetchRepoDocs({ owner, repo, fetchImpl, timeoutMs }) {
  const headers = {
    'user-agent': 'mlescaille-site-ask-index',
    accept: 'application/vnd.github+json',
  };
  const token = process.env.ASK_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  const commitResponse = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/commits/main`, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!commitResponse.ok) {
    const error = new Error('commit lookup failed');
    error.code = `HTTP${commitResponse.status}`;
    throw error;
  }
  const commit = (await commitResponse.json()).sha;
  if (!commit) {
    const error = new Error('missing commit');
    error.code = 'missing_commit';
    throw error;
  }
  const treeResponse = await fetchImpl(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${commit}?recursive=1`,
    { headers, signal: AbortSignal.timeout(timeoutMs) },
  );
  if (!treeResponse.ok) {
    const error = new Error('tree lookup failed');
    error.code = `HTTP${treeResponse.status}`;
    throw error;
  }
  const tree = await treeResponse.json();
  if (tree.truncated) {
    const error = new Error('tree truncated');
    error.code = 'truncated_tree';
    throw error;
  }
  const paths = (tree.tree || [])
    .filter(entry => entry.type === 'blob' && isDocPath(entry.path))
    .map(entry => entry.path);
  const files = [];
  for (const path of paths) {
    const rawResponse = await fetchImpl(`https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${path}`, {
      headers: { 'user-agent': headers['user-agent'] },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!rawResponse.ok) {
      const error = new Error('file fetch failed');
      error.code = `HTTP${rawResponse.status}`;
      throw error;
    }
    const text = await rawResponse.text();
    if (text.length > 200_000 || SECRET_LINE.test(text)) continue;
    files.push({ path, text });
  }
  return {
    repo: `${owner}/${repo}`,
    commit,
    fetchedAt: new Date().toISOString(),
    files,
  };
}

function writeSnapshot(dest, snapshot) {
  const existing = readMeta(dest);
  const sameCommit = existing?.commit === snapshot.commit
    && Array.isArray(existing.files)
    && existing.files.length === snapshot.files.length
    && snapshot.files.every(file => existing.files.includes(file.path));
  if (sameCommit && snapshot.files.every(file => {
    const path = join(dest, file.path);
    return existsSync(path) && readFileSync(path, 'utf8') === file.text;
  })) {
    return;
  }
  mkdirSync(dest, { recursive: true });
  const keep = new Set(snapshot.files.map(file => file.path));
  for (const existing of walk(dest)) {
    const rel = relative(dest, existing).split(sep).join('/');
    if (rel === '_snapshot.json' || keep.has(rel)) continue;
    rmSync(existing);
  }
  for (const file of snapshot.files) {
    if (!isDocPath(file.path)) continue;
    const target = join(dest, file.path);
    if (!inside(dest, target)) continue;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.text);
  }
  writeFileSync(join(dest, '_snapshot.json'), JSON.stringify({
    repo: snapshot.repo,
    commit: snapshot.commit,
    fetchedAt: snapshot.fetchedAt,
    files: snapshot.files.map(file => file.path),
  }, null, 2));
}

function readMeta(dest) {
  const path = join(dest, '_snapshot.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export async function buildAskIndex({ root, fetchImpl, now = new Date(), refresh = true } = {}) {
  const github = refresh ? await refreshGithubSources({ root, fetchImpl }) : [];
  const chunks = [
    ...loadWorkChunks(root, now),
    ...loadPageChunks(root),
    ...loadStoryChunks(root, now),
    ...loadCodeChunks(root),
  ];
  return {
    builtAt: now.toISOString(),
    entryPoints: ENTRY_POINTS,
    github,
    chunks,
  };
}
