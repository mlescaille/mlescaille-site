# mlescaille.com

Astro static site. One content collection (`work`) holds everything —
essays, poems, talks, explorables — which is what makes the mixed
"obra" list possible.

Coding agents should read `AGENTS.md` before changing the site. Web agents can
start with the curated `/llms.txt`, inspect `/content-index.json`, and retrieve
plain Markdown from the `index.md` alternative advertised by each local work.

## Run locally
    npm install
    npm run dev        # http://localhost:4321
    npm test           # ask pipeline, with no API key

## Ask

`/ask` answers questions about the public writing and the public repositories
(Lore and authz-agent-evals). With no `ASK_API_KEY`, it uses a deterministic
mock that quotes retrieved pages instead of calling a model. That is what
preview and `npm test` use.

To switch to a real model, set these in the Vercel project (server only; the
browser never sees them):

    ASK_API_KEY          # secret. Unset means the mock.
    ASK_API_BASE         # default https://openrouter.ai/api/v1
    ASK_ROUTER_MODEL     # required once a key is set
    ASK_ANSWER_MODEL     # required once a key is set
    ASK_PROVIDER         # set to mock to force the mock even when a key is present

Suggested cheap pair, as of November 2026, not hardcoded. Check current
OpenRouter prices before turning a key on. `google/gemini-2.5-flash-lite`
was about $0.10 / $0.40 per million input / output tokens.
`google/gemini-3.1-flash-lite` was the newer cheap Gemini at about $0.25 / $1.50.
Use the smaller one for both the router and the answer until a question
shows it is not enough.

    ASK_ROUTER_MODEL=google/gemini-2.5-flash-lite
    ASK_ANSWER_MODEL=google/gemini-2.5-flash-lite

Other limits, all optional:

    ASK_MAX_QUESTION_CHARS   # default 600
    ASK_RATE_LIMIT_MAX       # default 8 requests per IP per window
    ASK_RATE_LIMIT_WINDOW_MS # default 600000
    ASK_DAILY_REQUEST_CAP    # default 200 accepted questions per UTC day
    ASK_IP_HASH_SALT         # optional salt for the in-memory IP hash
    ASK_GITHUB_TOKEN         # optional, raises the GitHub rate limit during the index build

`ASK_DAILY_REQUEST_CAP` is a request cap, which is the spend cap until a
model is chosen and a token price is known. The counter lives in the
server process. A cold start or a second isolate does not share it.

The index is rebuilt by `scripts/build-ask-index.mjs` during `npm run build`.
Approved story pages can be added under `src/content/ask/stories/` with no
other code change. See `docs/interviewable-resume.md`.

## Publish a new article (the whole workflow)
1. Create `src/content/work/my-article.md`:

       ---
       title: "My article"
       kind: essay            # essay | poem | explorable | talk | audio | convention
       date: 2026-08-01
       note: "One-line description for lists."
       featured: true         # show on homepage
       draft: true            # invisible until false
       ---
       Body in markdown.

2. Write. Preview with `npm run dev`.
3. Set `draft: false`, commit, push. Vercel/Netlify rebuilds and it's live —
   article page, writing index, and homepage all update from the frontmatter.

For pieces that live elsewhere (Medium, YouTube), add `external: <url>`
and omit the body — they join the lists and link out.

The homepage "ahora / now" block is `src/data/now.json` — edit, push.

## Metrics
GoatCounter (free, no cookies, no consent banner):
1. Create an account at goatcounter.com with site code `mlescaille`.
2. Uncomment the script tag in `src/layouts/Base.astro`.
3. Dashboard at https://mlescaille.goatcounter.com — views, referrers,
   top pages. That's the basics covered.

Alternatives if you outgrow it: Plausible (~$9/mo, prettier), or
Cloudflare Web Analytics (free if DNS moves to Cloudflare).

## Newsletter
The form on the homepage needs a provider. Buttondown fits a writer
(markdown emails, subscriber stats, free < 100 subscribers): create an
account, then set the form action in `src/pages/index.astro` to
`https://buttondown.com/api/emails/embed-subscribe/<username>`.
Export your existing Squarespace subscriber list and import it there.

## Deploy
- Vercel or Netlify: import the repo, framework preset "Astro", done.
  Auto-deploys on every push.
- `/lore` is the [Lore](https://github.com/mlescaille/lore) app, built
  from the commit in `lore.rev` during `npm run build`. To publish a
  newer Lore, change that SHA and push. No second Vercel project.
- Point the mlescaille.com domain at the new deploy when ready;
  Squarespace stays live until the moment you flip DNS.

## Speaking page
/speaking is live with an "I'm open to speaking" block.
Replace the placeholder contact (hello@mlescaille.com) in
src/pages/speaking/index.astro with your real public address,
and prune the topics list to taste.

## Still to build
- /about page (nav link exists)
- Poetry migration from Squarespace (paste each poem as kind: poem)
- Museum link currently points at the GitHub repo — update when it has a home
