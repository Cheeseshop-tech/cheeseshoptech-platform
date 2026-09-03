#!/bin/bash
# COMMIT HOUSE CONSOLE SPEC — commit the House Console spec + handoff next-up. Docs only.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit House Console spec ──"

rm -f .git/index.lock

git add -A \
  docs/HOUSE_CONSOLE_SPEC.md \
  HANDOFF.md

git commit -m "docs: House Console spec (agency control plane) + handoff next-up

One house-admin console to onboard clients, import data, monitor all, and flip
between clients/tools with no re-login. Decisions: one app (not a generic twin),
SKU->Item number, spreadsheet-imported item data, brand-first onboarding. Build
order: console shell -> items importer -> bulk image+tag -> onboarding checklist."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && echo "Pushed." || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
