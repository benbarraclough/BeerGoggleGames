import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://benbarraclough.github.io/BeerGoggleGames/',
  base: '/BeerGoggleGames/',
  integrations: [mdx(), tailwind(), sitemap()],
});
