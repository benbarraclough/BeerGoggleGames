/**
 * Build a lightweight search index (title, slug, collection, excerpt).
 * Run before build (or add an npm script).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Dynamically import Astro's content dev helper
  const mod = await import('../node_modules/astro/dist/content/index.js');
  const { getCollection } = await mod.getContentEntryModule();

  const collections = ['games','cocktails','shots','activities','posts'];
  const entries = [];
  for (const c of collections) {
    try {
      const items = await getCollection(c);
      items.forEach(it => {
        entries.push({
          c,
            slug: it.slug,
            title: it.data.title,
            excerpt: it.data.excerpt || '',
            type: it.data.type || '',
            ingredients: it.data.ingredients || []
        });
      });
    } catch {
      // skip if collection not defined
    }
  }

  const outDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'search-index.json'), JSON.stringify(entries), 'utf8');
  console.log(`Search index written (${entries.length} items).`);
}

main();
