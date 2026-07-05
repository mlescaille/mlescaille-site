import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.mlescaille.com',
  markdown: {
    shikiConfig: { theme: 'github-light' }
  }
});
