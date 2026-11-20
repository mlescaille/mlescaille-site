import { newNonce } from './provider.mjs';
import { answerSystem, answerUserPrompt, routerSystem } from './prompts.mjs';
import { search } from './retrieve.mjs';
import { declineAnswer, forcedDecline, unknownAnswer } from './safety.mjs';

const ANSWER_LIMIT = 1200;

export function parseModelJson(text) {
  const source = String(text ?? '');
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
}

function parseRouter(text) {
  const route = parseModelJson(text)?.route;
  if (route === 'writing' || route === 'code' || route === 'decline') return route;
  return 'decline';
}

export function sanitizeAnswer(modelJson, hits) {
  const allowed = new Map();
  for (const hit of hits) {
    if (!allowed.has(hit.chunk.url)) allowed.set(hit.chunk.url, hit.chunk);
  }
  const urls = Array.isArray(modelJson?.citations) ? modelJson.citations : [];
  const citations = [];
  const seen = new Set();
  for (const url of urls) {
    if (typeof url !== 'string' || seen.has(url) || !allowed.has(url)) continue;
    seen.add(url);
    const chunk = allowed.get(url);
    citations.push({ title: chunk.title, url: chunk.url, source: chunk.source });
  }
  let answer = String(modelJson?.answer ?? '').replace(/\s+/g, ' ').trim();
  answer = answer.replace(/https?:\/\/[^\s)]+/g, (url) => {
    const cleaned = url.replace(/[.,;:]+$/, '');
    return allowed.has(cleaned) ? url : '';
  }).replace(/\s{2,}/g, ' ').trim();
  if (modelJson?.unknown || !answer || citations.length === 0) return { unknown: true };
  return { unknown: false, answer: answer.slice(0, ANSWER_LIMIT), citations };
}

function declineBody(category, pages) {
  return {
    outcome: 'declined',
    answer: declineAnswer(category),
    citations: [],
    pages,
  };
}

function unknownBody(pages) {
  return {
    outcome: 'unknown',
    answer: unknownAnswer(),
    citations: [],
    pages,
  };
}

function logEvent(log, now, event) {
  log?.({
    at: new Date(now).toISOString(),
    outcome: event.outcome,
    route: event.route ?? null,
    citations: event.citations ?? 0,
    status: event.status,
    ...(event.code ? { code: event.code } : {}),
  });
}

// question is never passed to log. Callers that persist logs must keep it that way.
export async function ask({
  question,
  index,
  provider,
  limiter,
  ip = 'unknown',
  maxChars = 600,
  log = () => {},
  now = new Date(),
}) {
  const trimmed = String(question ?? '').replace(/\s+/g, ' ').trim();
  const spend = trimmed.length > 0 && trimmed.length <= maxChars;
  const gate = limiter.check(ip, { spend });
  if (!gate.ok) {
    const outcome = gate.reason === 'daily' ? 'daily_cap' : 'rate_limited';
    const body = {
      outcome,
      answer: gate.reason === 'daily'
        ? "That's enough questions for today."
        : "That's enough questions for the moment. Try again shortly.",
      citations: [],
      pages: [],
    };
    logEvent(log, now, { outcome, status: 429 });
    return { status: 429, body, retryAfter: gate.retryAfter };
  }

  if (!trimmed) {
    const body = { outcome: 'invalid', answer: 'Ask a question first.', citations: [], pages: [] };
    logEvent(log, now, { outcome: 'invalid', status: 400 });
    return { status: 400, body };
  }
  if (trimmed.length > maxChars) {
    const body = {
      outcome: 'invalid',
      answer: `Keep the question under ${maxChars} characters.`,
      citations: [],
      pages: [],
    };
    logEvent(log, now, { outcome: 'invalid', status: 400 });
    return { status: 400, body };
  }

  const pages = index.entryPoints ?? [];
  try {
    const forced = forcedDecline(trimmed);
    if (forced) {
      const body = declineBody(forced.category, pages);
      logEvent(log, now, { outcome: 'declined', route: 'decline', status: 200 });
      return { status: 200, body };
    }

    const routerText = await provider.complete({
      purpose: 'router',
      system: routerSystem(),
      user: trimmed,
      temperature: 0,
      maxTokens: 80,
    });
    const route = parseRouter(routerText);
    if (route === 'decline') {
      const body = declineBody('router', pages);
      logEvent(log, now, { outcome: 'declined', route: 'decline', status: 200 });
      return { status: 200, body };
    }

    const hits = search(index.chunks, trimmed, { route });
    if (!hits.length) {
      const body = unknownBody(pages);
      logEvent(log, now, { outcome: 'unknown', route, status: 200 });
      return { status: 200, body };
    }

    const nonce = newNonce();
    const answerText = await provider.complete({
      purpose: 'answer',
      system: answerSystem(nonce),
      user: answerUserPrompt(trimmed, hits, nonce),
      temperature: 0,
      maxTokens: 500,
    });
    const safe = sanitizeAnswer(parseModelJson(answerText), hits);
    if (safe.unknown) {
      const body = unknownBody(pages);
      logEvent(log, now, { outcome: 'unknown', route, status: 200 });
      return { status: 200, body };
    }
    const body = {
      outcome: 'answered',
      answer: safe.answer,
      citations: safe.citations,
      pages: [],
      quoted: provider.kind === 'mock',
    };
    logEvent(log, now, { outcome: 'answered', route, citations: safe.citations.length, status: 200 });
    return { status: 200, body };
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : error?.name;
    logEvent(log, now, { outcome: 'error', status: 502, code });
    return {
      status: 502,
      body: {
        outcome: 'error',
        answer: "The question didn't go through. Nothing was answered.",
        citations: [],
        pages: [],
      },
    };
  }
}
