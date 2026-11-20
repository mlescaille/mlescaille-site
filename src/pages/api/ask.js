import { ask } from '../../ask/pipeline.mjs';
import { renderResultPage } from '../../ask/html.mjs';
import { createLimiter, limitsFromEnv } from '../../ask/limits.mjs';
import { createProvider } from '../../ask/provider.mjs';
import index from '../../generated/ask-index.json';

export const prerender = false;

const limits = limitsFromEnv();
const limiter = createLimiter(limits);
const provider = createProvider();

function log(event) {
  const line = {
    at: event.at,
    outcome: event.outcome,
    route: event.route ?? null,
    citations: event.citations ?? 0,
    status: event.status,
  };
  if (typeof event.code === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(event.code)) line.code = event.code;
  console.log(JSON.stringify({ ask: line }));
}

function json(body, status, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function clientIp(request, clientAddress) {
  if (clientAddress) return clientAddress;
  return request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

function questionFrom(raw, contentType) {
  if (contentType.includes('application/json')) {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return '';
    return String(data.question ?? '');
  }
  const params = new URLSearchParams(raw);
  const prompt = params.get('prompt');
  if (prompt && prompt.trim()) return prompt;
  return String(params.get('question') ?? '');
}

export function GET() {
  return json(
    { outcome: 'invalid', answer: 'Send a question with POST.', citations: [], pages: [] },
    405,
    { allow: 'POST' },
  );
}

export async function POST({ request, clientAddress }) {
  if (!originAllowed(request)) {
    return json(
      { outcome: 'invalid', answer: 'That request did not come from this page.', citations: [], pages: [] },
      403,
    );
  }

  const contentType = request.headers.get('content-type') || '';
  const asHtml = /application\/x-www-form-urlencoded|multipart\/form-data/i.test(contentType);
  let ip = 'unknown';
  try {
    ip = clientIp(request, clientAddress);
  } catch {
    ip = clientIp(request);
  }

  let question = '';
  try {
    const raw = await request.text();
    if (raw.length > 8000) {
      question = 'x'.repeat(limits.maxChars + 1);
    } else {
      question = questionFrom(raw, contentType);
    }
  } catch {
    question = '';
  }

  const result = await ask({
    question,
    index,
    provider,
    limiter,
    ip,
    maxChars: limits.maxChars,
    log,
  });

  if (asHtml) {
    return new Response(renderResultPage({ question, result: result.body }), {
      status: result.status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        ...(result.retryAfter ? { 'retry-after': String(result.retryAfter) } : {}),
      },
    });
  }

  return json(result.body, result.status, result.retryAfter ? { 'retry-after': String(result.retryAfter) } : {});
}
