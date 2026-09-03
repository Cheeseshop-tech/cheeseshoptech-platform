#!/bin/bash
# Double-click to commit + push: template tenant + onboarding kit + agents SDD.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "config/clients/_template.json" \
  "config/clients/demo.json" \
  "src/data/_template" \
  "src/lib/pricing.js" \
  "src/lib/images.js" \
  "src/lib/brandKit.js" \
  "src/lib/attention.js" \
  "src/lib/signals.js" \
  "src/lib/market-news.js" \
  "onboarding-kit" \
  "docs/ONBOARDING_AND_AGENTS_SDD.md" \
  "docs/CLIENT_ONBOARDING_GUIDE.md" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT ONBOARDING TEMPLATE.command"

git commit -m "feat(onboarding): template tenant + client intake kit + agents SDD

- _template.json upgraded stub -> THE CLONE: full Monti-shaped config (all modules,
  six tools, home block), content-free; still skipped by registry/validator
- src/data/_template/: empty-but-schema-valid data set for all nine seam files;
  brand-kit placeholder hexes blanked so config colors win until the kit is real
- demo tenant (config/clients/demo.json + demo: registered in pricing/images/brandKit/
  attention/signals/market-news seams): ?client=demo renders every app's empty state
  (QA reference + prospect showroom); new-client stand-up = config + data copy, ~15 min
- onboarding-kit/ (client-facing): 00 README (owners/cadence/ground rules),
  01 Product Catalog & Pricing.xlsx, 02 Inventory Availability.xlsx (weekly),
  03 Standing Orders & Commitments.xlsx, 04 Brand Asset Checklist.md,
  05 Marketing Content Worksheet.docx, 06 Sales History.xlsx (forecasting foundation)
- docs/CLIENT_ONBOARDING_GUIDE.md: internal runbook (tenant stand-up -> kit ->
  per-file ingestion map -> verification; known gaps listed)
- docs/ONBOARDING_AND_AGENTS_SDD.md: round spec + agent roster A1-A5 (content,
  pricing, replenishment, projection/production, campaign planning) with build order
  gated on data readiness; sales history identified as THE forecasting gap"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "Verify: https://cheeseshoptech-platform.netlify.app/?client=demo (empty portal, house passcode gate)."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
