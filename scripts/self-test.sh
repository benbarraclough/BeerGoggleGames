#!/usr/bin/env bash
set -euo pipefail

echo "== BeerGoggleGames self-test =="
echo "Node: $(node -v)"

# Match the supported runtime in .nvmrc and package.json.
V=$(node -p "process.versions.node")
MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$MAJOR" -ne 24 ]; then
  echo "ERROR: Node version $V is not supported. Use Node 24 LTS."
  echo "Try: nvm install && nvm use"
  exit 1
fi

echo "\n-- 1) Install (if needed) --"
if [ ! -d node_modules ]; then
  npm ci
else
  echo "node_modules present, skipping install"
fi

echo "\n-- 2) Sync types --"
npm run sync

echo "\n-- 3) Lint --"
npm run lint

echo "\n-- 4) Typecheck --"
npm run typecheck

echo "\n-- 5) Content maintenance --"
npm run maintenance

echo "\n-- 6) Build --"
npm run build

echo "\nAll checks passed. You can run: npm run preview"
