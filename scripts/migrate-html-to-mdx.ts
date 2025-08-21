/**
 * Migration scaffold:
 * - Read legacy HTML files from a provided directory
 * - Extract title and main content
 * - Write MDX into the appropriate collection folder with normalized slugs
 *
 * NOTE: This is a placeholder to be customized once we inspect the current repo structure.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

async function run() {
  console.log('Migration script scaffold — customize after we review the repo structure.');
}

run().catch((e) => { console.error(e); process.exit(1); });