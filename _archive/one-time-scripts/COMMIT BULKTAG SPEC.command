#!/bin/bash
# COMMIT BULKTAG SPEC — double-click to commit + push the bulk-tag tool spec + handoff update.
# Docs only (no app change). Commits AND pushes; Netlify will rebuild (no functional change).

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit bulk-tag spec + handoff ──"

rm -f .git/index.lock

git add -A \
  docs/BULK_TAG_TOOL_SPEC.md \
  HANDOFF.md

git commit -m "docs: tee up bulk-tag tool (spec) + refresh HANDOFF next-up

docs/BULK_TAG_TOOL_SPEC.md: Media Hub multi-select + apply usage tags to many
(ADD semantics; v1 = client loop over media-update, no backend change) to
backfill the 104 untagged assets. HANDOFF NEXT UP = bulk-tag, then client-admin
Product admin."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && echo "Pushed." || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
