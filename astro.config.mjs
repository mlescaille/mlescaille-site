import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';
import vercel from '@astrojs/vercel/static';

// Markdown tables have no wrapper, so a wide table stretches the page.
// Give each one a scroll container that stays inside the column.
function rehypeTableScroll() {
  const walk = (node) => {
    if (!node?.children) return;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === 'element' && child.tagName === 'table') {
        node.children[i] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['table-scroll'] },
          children: [child],
        };
      } else {
        walk(child);
      }
    }
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  site: 'https://www.mlescaille.com',
  output: 'static',
  adapter: vercel(),
  markdown: {
    shikiConfig: { theme: 'github-light', excludeLangs: ['mermaid'] },
    rehypePlugins: [
      rehypeTableScroll,
      [rehypeExternalLinks, {
        target: '_blank',
        rel: ['noopener', 'noreferrer'],
        content: { type: 'text', value: ' ↗' }
      }]
    ]
  }
});
