#!/usr/bin/env bash
# One-command board refresh + deploy for the ledger deck.
#
#   ./scripts/refresh.sh              # fetch -> regen -> build -> commit+push main -> deploy gh-pages
#   SKIP_DEPLOY=1 ./scripts/refresh.sh  # stop after the build (nothing pushed)
#
# Needs: gh (authed), node/npm, python3. Build takes ~4-5 min on this machine;
# don't trust `npm run dev` here (memory pressure) — the built dist is verified
# by grepping the bundle, and can be eyeballed with:
#   cd dist && python3 -m http.server 8123   # slides deep-linkable at /#3, /#7 ...
set -euo pipefail
cd "$(dirname "$0")/.."

LEDGER_JSON=$(mktemp)
trap 'rm -f "$LEDGER_JSON"' EXIT
gh api repos/chiKeka/ledger/contents/ledger.json --jq '.content' | base64 -d > "$LEDGER_JSON"
BOARD=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['updated'])" "$LEDGER_JSON")
# total commits in the ledger repo (the cadence slide's "N commits since go-live")
COMMITS=$(gh api 'repos/chiKeka/ledger/commits?per_page=1' -i 2>/dev/null \
  | grep -i '^link:' | grep -o 'page=[0-9]*>; rel="last"' | grep -o '[0-9]*' | head -1)

python3 scripts/refresh_data.py "$LEDGER_JSON" "${COMMITS:-}"

if git diff --quiet src/; then
  echo "No changes — board $BOARD already reflected. Nothing to build or push."
  exit 0
fi
git --no-pager diff --stat src/

npm run build -- --base=./
grep -q "board figures, $BOARD" dist/assets/index-*.js \
  || { echo "bundle sanity check failed: board figures, $BOARD not in bundle"; exit 1; }

[ "${SKIP_DEPLOY:-0}" = "1" ] && { echo "SKIP_DEPLOY=1 — built but not pushed."; exit 0; }

git add src/data/claims.ts src/App.tsx
git commit -m "Data refresh: board of $BOARD"
git push deck main:main

DEPLOY_DIR=$(mktemp -d)
cp -R dist/. "$DEPLOY_DIR"
git -C "$DEPLOY_DIR" init -q -b gh-pages
git -C "$DEPLOY_DIR" add -A
git -C "$DEPLOY_DIR" commit -q -m "Deploy deck build (board of $BOARD)"
git -C "$DEPLOY_DIR" push -f https://github.com/chiKeka/ledger-deck.git gh-pages:gh-pages
rm -rf "$DEPLOY_DIR"

echo "Deployed board $BOARD -> https://chikeka.github.io/ledger-deck/ (Pages takes ~1 min to flip)"
