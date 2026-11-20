import { escapeHtml } from './text.mjs';

function href(url) {
  if (typeof url !== 'string') return '';
  if (url.startsWith('https://www.mlescaille.com')) return url.slice('https://www.mlescaille.com'.length) || '/';
  if (url.startsWith('https://mlescaille.com')) return url.slice('https://mlescaille.com'.length) || '/';
  if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/')) return url;
  return '';
}

function external(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

function host(url) {
  if (url.startsWith('/')) return 'mlescaille.com';
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function linkList(items) {
  return items.map(item => {
    const target = href(item.url);
    if (!target) return '';
    const away = external(target);
    const extra = away ? ' target="_blank" rel="noopener noreferrer"' : '';
    const arrow = away ? '<span class="external-arrow" aria-hidden="true">↗</span>' : '';
    return `<li><a href="${escapeHtml(target)}"${extra}>${escapeHtml(item.title)}${arrow}</a><span class="host">${escapeHtml(host(item.url))}</span></li>`;
  }).join('');
}

// No-JavaScript reply. The styled page is src/pages/ask.astro; this is the
// same exchange, with the site's type and palette, when the form posts here.
export function renderResultPage({ question, result }) {
  const outcome = result.outcome || 'error';
  const citations = linkList(result.citations || []);
  const pages = linkList(result.pages || []);
  const listLabel = outcome === 'answered' ? 'Sources' : 'Pages I can speak from';
  const list = outcome === 'answered' ? citations : pages;
  const quoted = result.quoted ? '<p class="quoted">Quoted from the source.</p>' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ask — Mari Lescaille</title>
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;1,7..72,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{color-scheme:light;--paper:#FAF7FD;--ink:#2C1244;--muted:#5D4579;--line:#E3D6F2;--purple:#5B2D86;--purple-strong:#8A5BBF;--pink:#D6317F;--bg-raise:#FFFFFF;--serif:"Literata",Georgia,serif;--mono:"JetBrains Mono",ui-monospace,monospace}
  @media (prefers-color-scheme: dark){:root{color-scheme:dark;--paper:#1D0B33;--ink:#EFE5FB;--muted:#B79ED6;--line:#3E2360;--purple:#C9A9E8;--purple-strong:#A87ED4;--pink:#F06BAC;--bg-raise:#2A1347}}
  *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--serif);font-size:18px;line-height:1.65;border-top:4px solid var(--purple)}
  .wrap{max-width:660px;margin:0 auto;padding:48px 22px 72px}a{color:var(--purple)}
  h1{font-size:clamp(28px,5vw,38px);font-weight:500;margin:0}h1 a{color:var(--ink);text-decoration:none}
  .asked{margin:22px 0 0;color:var(--muted);font-style:italic}.reply{margin:14px 0 0;font-size:19px}
  .quoted{font-family:var(--mono);font-size:12px;color:var(--muted);margin:8px 0 0}
  .kicker{font-family:var(--mono);font-size:12px;letter-spacing:.06em;color:var(--purple);margin:22px 0 0}
  ol{margin:8px 0 0;padding-left:1.2em}li{margin:6px 0}.host{font-family:var(--mono);font-size:12px;color:var(--muted);margin-left:8px}
  .back{margin-top:28px;font-family:var(--mono);font-size:13px}
</style>
</head>
<body>
<div class="wrap">
  <h1><a href="/ask">Ask</a></h1>
  <p class="asked">${escapeHtml(question)}</p>
  <p class="reply">${escapeHtml(result.answer || '')}</p>
  ${quoted}
  ${list ? `<p class="kicker">${listLabel}</p><ol>${list}</ol>` : ''}
  <p class="back"><a href="/ask">Ask another</a></p>
</div>
</body>
</html>`;
}
