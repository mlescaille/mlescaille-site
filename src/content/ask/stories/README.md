# Story pages

Approved first-person pages live in this folder. The next build indexes them and publishes each one at `/ask/stories/<file-name>/`. Dropping a file in is the whole change.

This README is not indexed. Neither is a file whose name starts with `_`, a file with `draft: true`, or a file whose `date` is still in the future.

```yaml
---
title: "Title"
date: 2026-11-20
note: "One line for the description."
draft: true
---

The page, in the first person, after it has been approved.
```

Set `draft: false` when it should be cited. An optional `url` replaces the citation link when the prose also lives somewhere else. The page renders the prose as paragraphs. Markdown emphasis is flattened.
