# mlescaille.com

Astro static site. One content collection (`work`) holds everything —
essays, poems, talks, explorables — which is what makes the mixed
"obra" list possible.

## Run locally
    npm install
    npm run dev        # http://localhost:4321

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
