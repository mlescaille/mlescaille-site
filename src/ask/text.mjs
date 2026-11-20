// Small text helpers shared by the index builder, the answer pipeline, and tests.

export function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!field) continue;
    data[field[1]] = parseScalar(field[2].trim());
  }
  return { data, body: match[2] };
}

function parseScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '' || value === '~' || value === 'null') return '';
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

// Same publication rule as src/content.config.ts: drafts and future dates stay out.
export function isPublished(data, now = new Date()) {
  if (data.draft === true) return false;
  if (!data.date) return false;
  const date = new Date(data.date);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= now.getTime();
}

export function markdownToPlain(markdown) {
  let text = String(markdown).replace(/\r\n/g, '\n');
  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code) => `\n${code}\n`);
  text = text.replace(/!\[[^\]]*]\([^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)]\([^)]*\)/g, '$1');
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+[.)]\s+/gm, '');
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(^|[^\w])[*_]([^*_\n]+)[*_](?=[^\w]|$)/g, '$1$2');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function chunkPlain(text, { maxChars = 900 } = {}) {
  const paragraphs = String(text)
    .split(/\n{2,}/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const chunks = [];
  let current = [];
  let size = 0;

  const push = () => {
    if (!current.length) return;
    const joined = current.join('\n\n').trim();
    if (joined.length >= 20) chunks.push(joined);
    const tail = current[current.length - 1];
    current = tail && tail.length < 240 ? [tail] : [];
    size = current.reduce((sum, paragraph) => sum + paragraph.length + 2, 0);
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      push();
      current = [];
      size = 0;
      for (let index = 0; index < paragraph.length; index += maxChars) {
        const slice = paragraph.slice(index, index + maxChars).trim();
        if (slice.length >= 20) chunks.push(slice);
      }
      continue;
    }
    if (current.length && size + paragraph.length > maxChars) push();
    current.push(paragraph);
    size += paragraph.length + 2;
  }
  push();
  return chunks;
}

export function excerpt(text, max = 420) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
  if (stop > 160) return slice.slice(0, stop + 1);
  return `${slice.trimEnd()}…`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

// Visible copy from an Astro page source. Drops the layout script, styles, and comments
// so the index does not treat template code as something Mari wrote.
export function extractAstroText(source) {
  let text = String(source).replace(/^---[\s\S]*?---/, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  let previous;
  do {
    previous = text;
    text = text.replace(/\{[^{}]*\}/g, ' ');
  } while (text !== previous);
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  text = text.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
