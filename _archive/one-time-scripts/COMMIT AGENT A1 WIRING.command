#!/bin/bash
# Double-click to commit + push: Agent A1 data-wiring fix + build spec (2026-07-15).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/studio-director.js" \
  "docs/DATA_OWNERSHIP_MAP.md" \
  "docs/AGENT_A1_BUILD_SPEC.md" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT AGENT A1 WIRING.command"

git commit -m "fix(content-engine): Agent A1 data wiring + build spec

- studio-director.js: pickProducts() now sources product-range slide names from
  the canonical items.js record (Media Hub) instead of catalog.json's own name
  field, falling back to catalog.json only for SKUs not yet entered in the items
  doc. directDraft() loads the tenant's items.js doc alongside the existing
  listAssets() call. Removed a dead third image-resolution path in the same
  function (catalog.json's per-SKU image field) — confirmed via repo grep nothing
  downstream consumed it.
- Reverted-before-shipping: the plan to reroute image resolution from media.js's
  listAssets() to images.js's imageForCode() was checked against both files and
  abandoned — listAssets() IS the Media Hub; images.js is a narrower per-SKU
  manifest with no usage-tag/approval scoring, and swapping would have broken
  pickAsset()'s candidate selection. No image-path change made.
- DATA_OWNERSHIP_MAP.md: corrected the Product domain (was still saying product
  copy must not live in Media Hub, contradicting the 2026-07-03 items.js
  decision already live in code); split into Product identity+copy (Media Hub)
  vs Pricing (Price List) rows; fixed the SKU join diagram; logged the still-open
  catalog.json/items-seed.json duplicate name fields as tracked-not-fixed.
- Added AGENT_A1_BUILD_SPEC.md (Parts A-E) — Part A + the doc fix done this
  commit; Part B (Auto-compose UI) found already shipped in slide-studio.jsx,
  no code needed; Part C (Stage 2 AI) blocked on Anthropic billing setup; Part D
  (CST visual direction) and Part E (flagged post-sale pipeline stages) spec'd,
  not built.
- BUILD_LOG.md + HANDOFF.md updated with the full session record, including the
  images.json staleness gap surfaced along the way (manual sync only, no
  webhook/cron, VITE_IMAGES_BACKEND unset everywhere) — discussed, not fixed."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "NOTE: unrelated uncommitted work (images.js placeholder feature, pricing-tool.jsx,"
  echo "      marketing image request docs) was left untouched on purpose — its own button,"
  echo "      COMMIT PLACEHOLDER IMAGES.command, is still sitting there waiting for you."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
