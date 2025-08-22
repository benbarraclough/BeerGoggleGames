import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://benbarraclough.github.io/BeerGoggleGames',
  base: '/BeerGoggleGames/',
  integrations: [tailwind(), sitemap(), mdx()]
});
