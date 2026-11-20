import { randomBytes } from 'node:crypto';
import { excerpt } from './text.mjs';
import { localRoute } from './safety.mjs';

export function createProvider(env = process.env) {
  if (!env.ASK_API_KEY || env.ASK_PROVIDER === 'mock') return createMockProvider();
  if (!env.ASK_ROUTER_MODEL || !env.ASK_ANSWER_MODEL) return createMisconfiguredProvider();
  return createOpenAICompatibleProvider(env);
}

export function createMockProvider() {
  return {
    kind: 'mock',
    async complete({ purpose, system, user }) {
      if (purpose === 'router') return JSON.stringify(localRoute(user));
      return mockAnswer(system, user);
    },
  };
}

export function createMisconfiguredProvider() {
  return {
    kind: 'misconfigured',
    async complete() {
      const error = new Error('missing model name');
      error.code = 'missing_model';
      throw error;
    },
  };
}

export function createOpenAICompatibleProvider(env) {
  const base = String(env.ASK_API_BASE || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  return {
    kind: 'openai-compatible',
    async complete({ purpose, system, user, temperature = 0, maxTokens = 400 }) {
      const model = purpose === 'router' ? env.ASK_ROUTER_MODEL : env.ASK_ANSWER_MODEL;
      const response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.ASK_API_KEY}`,
          'http-referer': 'https://www.mlescaille.com',
          'x-title': 'Mari Lescaille Ask',
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: purpose === 'router' ? Math.min(maxTokens, 80) : maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        const error = new Error('provider request failed');
        error.code = `HTTP${response.status}`;
        throw error;
      }
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) {
        const error = new Error('empty completion');
        error.code = 'empty_completion';
        throw error;
      }
      return text;
    },
  };
}

function mockAnswer(system, user) {
  const nonce = /nonce: ([a-f0-9]+)/.exec(system)?.[1];
  const excerpts = nonce ? excerptsFromPrompt(user, nonce) : [];
  if (!excerpts.length) {
    return JSON.stringify({ unknown: true, answer: '', citations: [] });
  }
  const top = excerpts.slice(0, 2);
  const quoted = top.map(item => `From “${item.title}”: “${excerpt(item.text)}”`).join(' ');
  return JSON.stringify({
    unknown: false,
    answer: `I'll stay with what the page says. ${quoted}`,
    citations: top.map(item => item.url),
  });
}

function excerptsFromPrompt(user, nonce) {
  const start = `<<<EXCERPT ${nonce}`;
  const end = `EXCERPT ${nonce}>>>`;
  const excerpts = [];
  let cursor = 0;
  while (cursor < user.length) {
    const open = user.indexOf(start, cursor);
    if (open < 0) break;
    const close = user.indexOf(end, open + start.length);
    if (close < 0) break;
    const body = user.slice(open + start.length, close);
    const title = /^title:\s*(.*)$/m.exec(body)?.[1]?.trim() ?? '';
    const url = /^url:\s*(.*)$/m.exec(body)?.[1]?.trim() ?? '';
    const text = /text:\n([\s\S]*)$/m.exec(body)?.[1]?.trim() ?? '';
    if (url && text) excerpts.push({ title, url, text });
    cursor = close + end.length;
  }
  return excerpts;
}

export function newNonce() {
  return randomBytes(8).toString('hex');
}
