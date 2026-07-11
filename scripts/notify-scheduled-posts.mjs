import { readdirSync, readFileSync } from 'node:fs';

// Matches the cron interval in .github/workflows/notify-scheduled-posts.yml,
// plus a buffer so a slow-starting run doesn't miss a post.
const WINDOW_MINUTES = 20;

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

const due = [];
for (const file of files) {
  const raw = readFileSync(new URL(file, dir), 'utf8');
  const data = parseFrontmatter(raw);
  if (!data?.date || data.draft === 'true') continue;
  const date = new Date(data.date);
  if (date > windowStart && date <= now) due.push({ file, title: data.title, date: data.date });
}

if (due.length === 0) {
  console.log('No posts due for publishing in this window.');
  process.exit(0);
}

for (const post of due) {
  const text = `📝 <b>${escapeHtml(post.title)}</b> is scheduled for ${escapeHtml(post.date)} and its publish date has arrived.\n\n<a href="${deployHook}">Deploy now</a> to make it live.`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  if (!res.ok) {
    console.error(`Failed to notify for ${post.file}:`, await res.text());
    process.exitCode = 1;
  } else {
    console.log(`Notified for ${post.file}`);
  }
}
