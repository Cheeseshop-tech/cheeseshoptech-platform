#!/bin/bash
# Double-click to commit and push the Alpine Rind Co. demo-tenant build.
#
# What this ships: the "demo" tenant (config/clients/demo.json) is repointed from the old
# content-free _template clone to a full fictional showroom brand — Alpine Rind Co., a Vermont
# alpine-style creamery — built via the onboarding-discovery framework so the demo tenant now
# shows what real client onboarding output looks like, live, instead of an empty shell.
#
#   - config/clients/demo.json          — brand/home rewritten; crm set to "sample"
#   - config/clients/client.schema.json — crm enum gains "sample" (force-mock, never live HubSpot)
#   - src/data/demo/*.json (new)        — brand kit, catalog, pricing/inventory, CRM-adjacent
#                                          commitments, signals, attention, market news
#   - src/lib/{signals,attention,market-news,brandKit,images,pricing}.js
#                                        — demo BUNDLES entries repointed from _template to demo
#   - src/lib/crm.js                    — adds MOCK.demo dataset + force-mock guard for crm:"sample"
#   - src/data/demo/brand-kit.json / catalog.json / config/clients/demo.json
#                                        — colors/fonts corrected 2026-09-19 (Rick): the demo
#                                          tenant is the TEMPLATE that holds CST's own design
#                                          system, so it now runs the actual documented house
#                                          tokens (Terracotta #9A3B1B / Cellar Olive #5F6B2E,
#                                          Fraunces/Inter) instead of an invented palette —
#                                          catalog gradients recolored to match.
#   - src/components/tools/quote-builder.jsx
#                                        — design-system audit fix: the printed quote's page
#                                          background/panel/ink/muted colors used to match by
#                                          Monti's own proper color names ("Heritage Cream" etc.),
#                                          so every OTHER tenant silently fell through to Monti's
#                                          hardcoded hex. Now matches by the color's role instead,
#                                          so a real client (or this demo tenant) prints its own
#                                          colors, not Monti's. Verified against both tenants'
#                                          brand kits — montitrentini's output is byte-identical
#                                          to before; demo now resolves its own five colors.
#
# montitrentini's live tenant path is untouched — verified with `npm run validate:clients`
# and `npm run build` (transform stage) before this script was created.

cd "$(dirname "$0")" || exit 1

if pgrep -x git >/dev/null 2>&1; then
  echo "⚠️  A git process is actually running right now — not touching lock files."
  echo "    Close it (or wait), then run this again."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "✅ Removed stale $lock" || echo "⚠️  Could not remove $lock — run: sudo rm $lock"
  fi
done

echo
echo "Staging the Alpine Rind Co. demo-tenant files…"
git add \
  "config/clients/demo.json" \
  "config/clients/client.schema.json" \
  "src/data/demo/" \
  "src/lib/signals.js" \
  "src/lib/attention.js" \
  "src/lib/market-news.js" \
  "src/lib/brandKit.js" \
  "src/lib/images.js" \
  "src/lib/pricing.js" \
  "src/lib/crm.js" \
  "src/components/tools/quote-builder.jsx"

git status --short -- config/clients src/data/demo src/lib

echo
git commit -m "Populate demo tenant with Alpine Rind Co. showroom brand

Repoints the demo tenant (config/clients/demo.json) from the content-free
_template clone to a fictional showroom brand built via the onboarding-
discovery framework, so the demo tenant now proves what real client
onboarding output looks like instead of showing an empty shell.

- New src/data/demo/*.json: brand kit (design system + voice), catalog,
  client config/pricing, inventory, commitments, signals, attention,
  market news
- src/lib/{signals,attention,market-news,brandKit,images,pricing}.js:
  demo BUNDLES entries repointed from _template to demo
- src/lib/crm.js: adds MOCK.demo dataset; crm:\"sample\" always forces
  mock data, regardless of the global VITE_CRM_BACKEND switch, so this
  fictional tenant can never fall through to a live HubSpot read
- client.schema.json: crm enum gains \"sample\"
- demo tenant brand kit/config/catalog: colors and fonts corrected to CST's
  actual documented house design system (docs/DESIGN_SYSTEM.md Part A —
  Terracotta/Cellar Olive/Fraunces/Inter) instead of an invented palette,
  per Rick: the demo tenant is the template that holds the design system.
- quote-builder.jsx: fixes a cross-tenant color leak found during a design-
  system audit — the printed quote's page background/panel/ink/muted
  colors matched by Monti's own color NAMES, so every other tenant silently
  fell through to Monti's hardcoded hex despite a comment claiming otherwise.
  Now matches by role, with index-based fallback. montitrentini's resolved
  colors are unchanged; demo/Alpine Rind now resolves its own.

montitrentini's live tenant path is untouched. Validated with
npm run validate:clients and npm run build (transform stage)."

status=$?
echo
if [ $status -ne 0 ]; then
  echo "⚠️  Commit failed (status $status) — nothing pushed."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

echo "Pushing to GitHub (this triggers a Netlify deploy)…"
git push
push_status=$?
echo
if [ $push_status -eq 0 ]; then
  echo "✅ Committed and pushed. Netlify is building — live in ~1–2 min."
else
  echo "⚠️  Push failed (status $push_status). If it asks for GitHub login, sign in and run again."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
