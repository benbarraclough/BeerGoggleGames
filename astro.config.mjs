import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://benbarraclough.github.io/BeerGoggleGames',
  base: '/BeerGoggleGames',
  integrations: [tailwind({ applyBaseStyles: true }), mdx(), sitemap()],
  markdown: { drafts: false },
  build: { format: 'directory' }
});