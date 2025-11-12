#!/usr/bin/env bash
set -euo pipefail

echo "== BeerGoggleGames self-test =="
echo "Node: $(node -v)"

# Require Node >= 18.20.8 or >= 20.x (quick check for 20 first)
REQ_OK=0
if node -v | grep -Eq '^v20\.'; then
  REQ_OK=1
else
  # Fallback: quick semver check for >=18.20.8
  V=$(node -p "process.versions.node")
  MAJOR=$(echo "$V" | cut -d. -f1)
  MINOR=$(echo "$V" | cut -d. -f2)
  PATCH=$(echo "$V" | cut -d. -f3)
  if [ "$MAJOR" -eq 18 ] && [ "$MINOR" -ge 20 ] && [ "$PATCH" -ge 8 ]; then
    REQ_OK=1
  fi
fi

if [ "$REQ_OK" -ne 1 ]; then
  echo "ERROR: Node version $V is not supported. Use Node 20 (recommended) or >=18.20.8."
  echo "Try: nvm install 20 && nvm use 20  (or brew install node@20 && brew link --overwrite --force node@20)"
  exit 1
fi

echo "\n-- 1) Install (if needed) --"
if [ ! -d node_modules ]; then
  npm install
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
