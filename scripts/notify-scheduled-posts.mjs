import { readdirSync, readFileSync } from 'node:fs';

// A post is "due" if its `date` fell within the last WINDOW_MINUTES. The default
// (20) comfortably covers the 15-minute cron interval plus GitHub's frequent
// scheduling delays, so a post is never missed. Overridable via env for testing
// (e.g. a large window to re-notify an older post on demand).
const WINDOW_MINUTES = Number(process.env.WINDOW_MINUTES) || 20;

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
if (!token || !chatId || !deployHook) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, or VERCEL_DEPLOY_HOOK_URL');
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    data[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return data;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const now = new Date();
const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

const dir = new URL('../src/content/work/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.md'));
console.log(`Scanned ${files.length} markdown files.`);
console.log(`Publish window: ${windowStart.toISOString()} .. ${now.toISOString()} (${WINDOW_MINUTES} min).`);

const dated = [];
for (const file of files) {
  const raw = readFileSync(new URL(file, dir), 'utf8');
  const data = parseFrontmatter(raw);
  if (!data?.date || data.draft === 'true') continue;
  dated.push({ file, title: data.title, date: data.date, when: new Date(data.date) });
}

const due = dated.filter(p => p.when > windowStart && p.when <= now);

if (due.length === 0) {
  console.log('No posts due for publishing in this window.');
  // Surface the nearest-dated post so a failed test is easy to diagnose from the log.
  const nearest = dated
    .map(p => ({ ...p, distMin: Math.abs(p.when.getTime() - now.getTime()) / 60000 }))
    .sort((a, b) => a.distMin - b.distMin)[0];
  if (nearest) {
    console.log(`Nearest post: "${nearest.title}" at ${nearest.date} (${nearest.distMin.toFixed(1)} min from now).`);
  }
  process.exit(0);
}

for (const post of due) {
  const text = `📝 <b>${escapeHtml(post.title)}</b> is scheduled for ${escapeHtml(post.date)} and its publish date has arrived.\n\n<a href="${deployHook}">Deploy now</a> to make it live.`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`Failed to notify for ${post.file}: ${res.status} ${body}`);
    process.exitCode = 1;
  } else {
    console.log(`Notified for ${post.file}: ${body}`);
  }
}
