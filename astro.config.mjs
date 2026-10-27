import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://beergogglegames.co.uk',
  // base removed because the site now lives at the domain root
  trailingSlash: 'always',
  // Preserve HTML whitespace behaviour when upgrading to Astro 7.
  compressHTML: true,
  integrations: [mdx(), sitemap()]
});
