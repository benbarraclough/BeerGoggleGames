import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://beergogglegames.co.uk',
  // base removed because the site now lives at the domain root
  trailingSlash: 'always',
  integrations: [tailwind(), mdx(), sitemap()]
});
