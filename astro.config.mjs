import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';
import vercel from '@astrojs/vercel/static';

export default defineConfig({
  site: 'https://www.mlescaille.com',
  output: 'static',
  adapter: vercel(),
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
