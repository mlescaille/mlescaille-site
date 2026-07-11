import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';

export default defineConfig({
  site: 'https://www.mlescaille.com',
  markdown: {
    shikiConfig: { theme: 'github-light', excludeLangs: ['mermaid'] },
    rehypePlugins: [
      [rehypeExternalLinks, {
        target: '_blank',
        rel: ['noopener', 'noreferrer'],
        content: { type: 'text', value: ' ↗' }
      }]
    ]
  }
});
