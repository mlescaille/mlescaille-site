# Agent guide

This repository is Mari Lescaille's personal Astro site. Preserve its quiet,
literary visual language and its bilingual details. Prefer focused changes over
new frameworks, global state, or client-side JavaScript.

## Work safely

- Use Node 24 and the existing npm lockfile.
- Run `npm install` only when `node_modules` is missing or dependencies changed.
- Use `npm run dev` for local development and `npm run build` before handing off.
- After a successful build, run `npm run check:agent-ready` when changing
  content metadata, feeds, discovery files, or generated routes.
- Do not publish drafts or future-dated work. All content queries should use
  `isPublished` from `src/content.config.ts`.
- Preserve unrelated working-tree changes. In particular, do not replace assets
  or copy unless the task calls for it.

## Architecture

- `src/layouts/Base.astro` owns global metadata, navigation, design tokens, and
  shared styles.
- `src/pages/` defines the static routes and generated feeds.
- `src/content/work/` is the single content collection for essays, poetry,
  talks, audio, and explorables.
- `src/content.config.ts` is the source of truth for frontmatter and publication
  rules.
- `src/data/now.json` is the editable "now" data.

Keep canonical URLs under `https://www.mlescaille.com`. New public routes should
normally be added to `src/pages/sitemap.xml.js`; machine-readable discovery
routes should also be linked from `public/robots.txt` when appropriate.

## Content conventions

New work belongs in `src/content/work/<slug>.md` with this frontmatter:

```yaml
---
title: "Title"
kind: essay
date: 2026-08-01
note: "One-line description used in lists and metadata."
shelf: systems
lang: en
draft: true
---
```

Valid `kind`, `shelf`, and `lang` values are defined in
`src/content.config.ts`. Keep `draft: true` until publication. Use `external`
for work hosted elsewhere. Do not create a local article page for external work.

## Definition of done

- The production build succeeds.
- New routes use `Base.astro` or return an explicit content type.
- Links, canonical paths, RSS, sitemap, and `/llms.txt` remain consistent.
- Markdown alternatives and `/content-index.json` expose the same normalized
  metadata as their HTML source pages.
- Interactive UI is keyboard accessible and respects the existing light/dark
  palette.
