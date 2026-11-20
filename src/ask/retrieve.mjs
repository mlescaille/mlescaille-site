// BM25 over the chunk list. The corpus is the site plus two READMEs, so a
// lexical scorer is enough and it runs with no key, no model, and no vector
// database. Document frequency is counted per source URL, not per chunk,
// because one README splits into several chunks that would otherwise look common.

const STOP = new Set(`
  a an the of to and or in on for is are was were be been being
  what how who when where why which did do does your you about
  write wrote written writing from with that this it as at by
  have has had page pages essay essays poem poems her she me my we our
  tell think thinking feel feeling know known believe want make made really
  something anything please just into over than then also can could
  que qué como cómo para una uno unos unas los las del con por sus ella
  más pero este esta esto cuando donde dónde porque desde entre también
  hay son está mi tu su nos
`.trim().split(/\s+/));

const SPELLING = {
  archaeology: 'archeology',
  archeologies: 'archeology',
};

export function tokens(text) {
  // URLs and paths were drowning the Lore README: a deploy section full of
  // `/lore/` outranked the introduction, which is the part that says what Lore is.
  const cleaned = String(text)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/(?:^|\s)[\w.@+-]*\/[\w./@+-]+/g, ' ');
  const found = cleaned.toLowerCase().match(/\p{L}[\p{L}'-]*/gu) || [];
  const out = [];
  for (const raw of found) {
    const trimmed = raw.replace(/^'+|'+$/g, '');
    const word = SPELLING[trimmed] || trimmed;
    if (word.length < 3 || STOP.has(word)) continue;
    out.push(word);
  }
  return out;
}

function matchesRoute(chunk, route) {
  if (route === 'code') return chunk.source === 'code';
  if (route === 'writing') return chunk.source === 'writing' || chunk.source === 'story';
  return false;
}

function scorePool(pool, queryTokens) {
  const docs = pool.map(chunk => ({
    chunk,
    toks: tokens(`${chunk.title} ${chunk.text}`),
    url: chunk.url,
  }));
  const byUrl = new Map();
  for (const doc of docs) {
    if (!byUrl.has(doc.url)) byUrl.set(doc.url, new Set());
    for (const token of doc.toks) byUrl.get(doc.url).add(token);
  }
  const urls = [...byUrl.values()];
  const docCount = urls.length || 1;
  const df = new Map();
  for (const set of urls) {
    for (const token of set) df.set(token, (df.get(token) || 0) + 1);
  }
  const avgdl = docs.reduce((sum, doc) => sum + doc.toks.length, 0) / (docs.length || 1);
  const k1 = 1.2;
  const b = 0.75;
  const uniqueQuery = [...new Set(queryTokens)];

  return docs.map(doc => {
    const tf = new Map();
    for (const token of doc.toks) tf.set(token, (tf.get(token) || 0) + 1);
    let score = 0;
    const matched = [];
    for (const token of uniqueQuery) {
      const freq = tf.get(token) || 0;
      if (!freq) continue;
      matched.push(token);
      const n = df.get(token) || 0;
      const idf = Math.log(1 + (docCount - n + 0.5) / (n + 0.5));
      const denom = freq + k1 * (1 - b + b * (doc.toks.length / (avgdl || 1)));
      score += idf * ((freq * (k1 + 1)) / denom);
    }
    return { chunk: doc.chunk, score, matched, df, docCount };
  });
}

function isRelevant(hit, queryCount) {
  if (hit.score <= 0 || hit.matched.length === 0) return false;
  // "quartz ferns" must not be answered by an essay that only mentions Quartz.
  if (queryCount >= 2 && hit.matched.length / queryCount <= 0.5) return false;
  if (hit.matched.length >= 2) return true;
  const [only] = hit.matched;
  const frequency = hit.df.get(only) || hit.docCount;
  const rareEnough = frequency <= Math.max(2, Math.ceil(hit.docCount * 0.1));
  return queryCount === 1 && only.length >= 4 && rareEnough;
}

export function search(chunks, query, { route, limit = 4 } = {}) {
  const pool = (chunks || []).filter(chunk => matchesRoute(chunk, route));
  const queryTokens = [...new Set(tokens(query))];
  if (!pool.length || !queryTokens.length) return [];
  const ranked = scorePool(pool, queryTokens)
    .filter(hit => isRelevant(hit, queryTokens.length))
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return [];
  const best = ranked[0].score;
  const byUrl = new Map();
  for (const hit of ranked) {
    if (hit.score < best * 0.6) break;
    const previous = byUrl.get(hit.chunk.url);
    if (!previous || hit.score > previous.score) byUrl.set(hit.chunk.url, hit);
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
