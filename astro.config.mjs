import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://benbarraclough.github.io/BeerGoggleGames',
  base: '/BeerGoggleGames/',   // keep trailing slash
  trailingSlash: 'always',     // ensure directory-style URLs
  integrations: [tailwind(), mdx(), sitemap()]
});
