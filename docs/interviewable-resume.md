# An interviewable resume

Notes for the article. This is what phase 1 actually does, why, and what broke along the way. Newest notes are at the bottom.

## What it is

`/ask` lets a visitor ask about the public work. A server route answers in the first person, cites the page or file the answer came from, and says "I don't know" when the pages don't cover it. The browser never sees a model key.

There are two model calls, behind one provider:

1. Router. A cheap model classifies the question as `writing` (the site), `code` (the public repositories), or `decline`.
2. Answer. A cheap model may speak only from the chunks the router’s source returned. The server throws away any citation that was not in those chunks. An answer with no surviving citation is replaced with "I don't know."

With no `ASK_API_KEY`, both calls are a deterministic mock. The mock router is a small classifier. The mock answerer quotes the retrieved text instead of paraphrasing it, because a paraphrase with no model would be me writing in Mari’s voice. The page says "Quoted from the source" in that mode. Preview and `npm test` use the mock. Set `ASK_PROVIDER=mock` to keep the mock even after a key exists.

## How a question moves

`src/pages/ask.astro` is a normal page. The form posts to `src/pages/api/ask.js`, which is the only route with `prerender = false`. The script on the page fills the reply in place. With JavaScript off, the same form posts and the route returns a small HTML page in the same palette.

The handler, in order:

1. Reject a cross-origin `Origin`. Missing `Origin` is allowed, so a curl still works, and the rate limit still applies.
2. Read the question from JSON or from the form. Cap the body at 8,000 characters before parsing.
3. Per-IP rate limit, then the daily request cap. Empty and over-long questions do not spend the daily cap. They do spend the per-IP window, so a flood of junk still gets slowed down.
4. A lexical screen. Employer internals, prompt injection, and a few obviously off-topic shapes are declined here and the model is not called.
5. Router call. Anything other than `writing` or `code` is a decline, including an unparseable reply.
6. Retrieve. No hits: "I don't know," and the reply lists the pages the index does have (writing, poetry, about, speaking, Lore, the two repositories). The answer model is not called.
7. Answer call, with a per-request nonce around the excerpts so a question cannot forge an excerpt boundary the mock would trust.
8. Keep only citations whose URLs were in the retrieved chunks. Strip any other URL out of the prose. If nothing citable remains, the outcome is "I don't know."

Declines point at those same pages. They do not try to answer.

## What is indexed

Built by `scripts/build-ask-index.mjs` before `astro build`, into `src/generated/ask-index.json` (gitignored; the function bundles it).

Included:

- Published files in `src/content/work`. Same rule as the site: `draft: true` and a future `date` stay out. External pieces contribute their title and note plus the external URL, not a body they don't have here.
- The visible text of the home page, About, and Speaking. The writing and poetry indexes are generated from the collection, so indexing them would duplicate titles and pick up template leftovers.
- `src/content/ask/stories/*.md`, except `README.md`, names starting with `_`, `draft: true`, and future dates. A published story is also a page at `/ask/stories/<slug>/`. That is the phase 2 slot: drop a file in, next build indexes it and publishes it. No code change. The page renders paragraphs. Emphasis and links are flattened.
- README, and `docs/` or `doc/` markdown, from `mlescaille/lore` and `mlescaille/authz-agent-evals`. Root `CONTRIBUTING`, `ARCHITECTURE`, and `DESIGN` count. `CHANGELOG`, license files, and anything under `eval/` do not.

Not included, on purpose:

- `src/data/now.json`. It is not rendered on a public page. The strings in it are in-progress notes.
- Eval fixtures, ground truth, and protocol files in authz-agent-evals. The README already describes the project. The fixtures are an answer key and a pile of attack-shaped text, which is a bad thing to hand an answer model.
- Draft essays. Checked against a draft that talks about a sixty-six-day plan; that sentence is not in the index.

Each chunk stores the source URL. Repository files are pinned to the commit that was fetched, so the link matches the text.

### Why a snapshot and a fetch

The build tries GitHub first (`ASK_GITHUB_TOKEN` or `GITHUB_TOKEN` if present, otherwise anonymous). On success it refreshes `src/content/ask/sources/<repo>/` and writes `_snapshot.json` with the commit. If the commit and the file bytes are unchanged, it does not rewrite them, so a rebuild does not dirty git just to bump a timestamp. If GitHub fails, the committed snapshot is what gets indexed and the build continues. The reason stored on the index is an error code (`HTTP403`), not the response body.

Fetching keeps the README from going stale. Vendoring means a rate limit or an outage does not take the site down. Both are in the repo now: the fetch succeeded at `7ef715a` for Lore and `681ca0a` for authz-agent-evals, and a test covers the failure path.

## Retrieval

BM25, in `src/ask/retrieve.mjs`, over the chunk list. No embeddings, no vector database.

The corpus is a few hundred chunks. BM25 is deterministic, free, and testable without a key. An embedding index would need a model at build time and again on every question, which contradicts "the preview works with no key" and "don't hardcode a paid dependency." Paraphrases with no shared words will miss. That miss becomes "I don't know," which is the behavior we want from a miss.

Document frequency is counted per URL, not per chunk. One README split into twenty chunks would otherwise look like a common term.

A hit counts only when it is specific enough:

- Two or more query words, and those words are more than half of the query's content words, or
- The query has a single content word, it is at least four letters, and it is rare in that source.

"code" alone is not an answer. "code archeology" is. `archaeology` is normalized to `archeology` because the essay spells it that way. Stopwords include a short Spanish list so a question in Spanish is not scored on "qué" and "para". There is no stemmer.

The router’s `writing` bucket also searches story chunks, so phase 2 does not need a new route label. `code` searches only the repositories.

## The provider

`src/ask/provider.mjs` exposes `complete({ purpose, system, user })`. Two implementations:

- `mock`, the default when `ASK_API_KEY` is unset or `ASK_PROVIDER=mock`.
- OpenAI-compatible chat completions. `ASK_API_BASE` defaults to `https://openrouter.ai/api/v1`. `ASK_ROUTER_MODEL` and `ASK_ANSWER_MODEL` are required once a key is set. If the key is set and a model name is missing, the call fails closed with a calm error. It does not silently bill a model I picked.

Suggested cheap pair, November 2026, written in the README and not in code: `google/gemini-2.5-flash-lite` (about $0.10 / $0.40 per million input / output tokens on OpenRouter). `google/gemini-3.1-flash-lite` was the newer cheap Gemini at about $0.25 / $1.50. Prices move. Check them before turning a key on.

`ASK_DAILY_REQUEST_CAP` (default 200) is a request cap. It stands in for a spend cap until a model and a token price exist. `ASK_RATE_LIMIT_MAX` defaults to 8 per IP per 10 minutes. `ASK_MAX_QUESTION_CHARS` defaults to 600, and the textarea uses the same number.

## Guardrails that are not the model

The model is not the boundary. The lexical screen declines before any call. The screen looks for employer internals (internal systems, customer metrics, confidential, NDA, proprietary, unreleased, production incidents), instruction-override attempts, and a few off-topic shapes (weather forecasts, who won, recipes, "write me a poem"). It does not contain an employer name. A question that merely contains "weather" inside "what did you write about" is not declined. The screen will over-refuse. That is cheaper than the opposite.

The public About page is in the index, because it is already published. A question the pages can answer from that text can be cited. A question asking for internal systems is declined before retrieval, so the model never sees the page in that context.

On the answer side, the server keeps an allowlist of retrieved URLs. Invented links are dropped from the citation list and from the prose. This does not prove every sentence is entailed by the chunk. A live model can still over-claim inside a cited answer. The mock cannot, because it quotes. Closing the entailment gap wants a checker or a model that is only allowed to span-copy. Not in this phase.

## What gets logged

One JSON line per request, from the server process:

```json
{"ask":{"at":"...","outcome":"answered","route":"writing","citations":1,"status":200}}
```

`outcome` is `answered`, `unknown`, `declined`, `rate_limited`, `daily_cap`, `invalid`, or `error`. `route` is `writing`, `code`, `decline`, or null. `citations` is a count. On a provider failure, `code` may be `HTTP429` or `missing_model` or another short token. The question, the answer, the chunk text, the IP, and the user agent are not logged.

The rate limit stores a SHA-256 of `salt + ip` in memory, with a random per-process salt unless `ASK_IP_HASH_SALT` is set. The hash is not logged. The map dies with the process. On Vercel that means each isolate has its own window and its own daily counter. A cold start resets them. It will not stop a determined person who sprays across many isolates. It will stop a chatty tab on a warm instance, and it needs no database. A shared counter (Vercel KV or similar) is the upgrade when the cap has to be real.

Questions are POST bodies, not query strings, so they do not land in the URL access log either.

## Design

The page uses the existing type, the VenusIT palette, and the Spanish section label (`para empezar`). The question sits on a pink margin rule, the way a notebook has a margin, not inside a chat bubble. Suggested questions are a list of buttons that look like the other lists on the site. The reply is a heading, the question in italics, a paragraph, and a numbered source list. No avatar, no typing dots, no "assistant."

Enter asks. Shift+Enter is a newline. After a reply, focus moves to the heading.

## What I tried that did not work

**BM25 as first written quoted the wrong part of Lore.** "What is Lore?" retrieved the deploy section of the README, the one full of `/lore/` paths, instead of "Discover your lore. You drop in your screenshots…" Path tokens were the whole score. Tokenizing now strips URLs and slash-paths before counting. After that, the same question quotes the introduction. One chunk per URL is kept, and a hit under 60% of the best score is dropped, so a second weak page does not get equal billing.

**A single rare word was too willing.** "What did you write about quartz ferns?" came back as an answer, citing the Flawed Beauty essay, because that essay mentions Quartz the publication and "quartz" is rare. The pages do not discuss ferns. A hit now has to cover more than half of the query's content words when the query has more than one. Ferns correctly becomes "I don't know." A question that is only "what did you write about Quartz?" still cites the essay. There is a test for both.

**A test question grew extra tokens and fell into that rule.** I had appended `UNIQUE_SENTINEL_QUESTION` to "What is code archeology?" to prove the log did not contain it. After the coverage change, those extra words made a real question look unanswered. The log test now uses the plain question and asserts that neither `archeology` nor `renovation` (a word from the answer) appears in the log line. Same property, without tripping retrieval.

**Scoped styles did not reach the reply.** The exchange is built in the page script, and Astro's scoped CSS only matches elements that were in the template. "You asked" ran into the question, and the host sat on the link with no gap. The page styles are `is:global` but only loaded with this page, so the script's nodes pick them up. I noticed it in the first screenshots, not in the unit tests.

**`npm run check:agent-ready` looked in `dist/` and failed.** A fully static build writes `robots.txt` there. Adding one server route switches the build to server mode, and the prerendered files move to `dist/client/`. The check now uses `dist/` when `robots.txt` is there and `dist/client/` otherwise. The files themselves were fine: sitemap and `llms.txt` both include `/ask/`.

**Posting the form to the Astro page.** `.astro` pages render documents. The POST handler has to be an endpoint, or the platform has nothing to invoke. The page stays static and cached. Only `/api/ask` is a function. `output` stays `static`; one `prerender = false` flips the build to the server adapter for that route and leaves every other page prerendered. The import `@astrojs/vercel/static` is a deprecated alias of `@astrojs/vercel`, so the config now imports the current entry. Behavior is the same adapter.

**Embeddings.** Not built. The reason is above. I did not spend a day on a local model to then delete it.

## Known limits

- The mock quotes. It will quote a sentence that assumes the previous paragraph. The archeology, Lore, and onboarding questions land on a sentence that stands alone. A vaguer question may not.
- Lexical search misses paraphrases. "I don't know" is the intended result, not a guess.
- The daily cap and the IP limit are per process.
- A live model can still embroider inside a citation. The allowlist stops invented links, not invented adjectives.
- Story pages are paragraphs, not a full markdown theme.
- The lexical screen can refuse a fair question that happens to say "confidential" or "NDA".
