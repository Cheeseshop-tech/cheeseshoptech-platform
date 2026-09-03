#!/bin/bash
# COMMIT OWNERSHIP UPDATE — commit the client-admin Product admin decision in the ownership map.
# Docs only. Commits AND pushes.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit ownership map update ──"

rm -f .git/index.lock

git add -A docs/DATA_OWNERSHIP_MAP.md

git commit -m "docs(ownership): Product admin = client-admin access (clients own product data)

Record the role decision: product data is the client's own knowledge, so the
Product admin is client-admin (+house admin); Brand Kit stays house-only. Adds
the 'who edits' column + role rationale to the ownership map."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && echo "Pushed." || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
