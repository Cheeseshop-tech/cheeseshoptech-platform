#!/bin/bash
# COMMIT PRODUCT COMPLIANCE DOCUMENTS SPEC — spec sheets, nutrition/allergen data, onboarding packets
# Double-click to commit and push. Docs only — no code changes.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Product Compliance Documents spec"
echo "=============================================="
echo

# Clear stale sandbox lock files first (known FUSE trap — see memory: sandbox git lock trap)
for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "docs/PRODUCT_COMPLIANCE_DOCUMENTS_SPEC.md" \
  "docs/BACKLOG.md" \
  "docs/SHEET_BANNER_AUTOUPDATE_2026-08-13.md" \
  "COMMIT PRODUCT COMPLIANCE DOCUMENTS SPEC.command"
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "docs: Product Compliance Documents spec — spec sheets, nutrition, onboarding packets

The documents a distributor or supermarket chain asks for before a first order.
Spec only, no code changes.

Three layers, because one artifact is genuinely three things:
- compliance data (nutrition, allergens, ingredients, UPC/EAN, shelf life,
  origin) lives on the item record as DATA, not inside a PDF — otherwise every
  retailer's own new-item form means re-keying it by hand
- producer-issued PDFs are stored market- and revision-controlled and
  distributed as-is; they are authored under Monti's document control and CST
  never edits or regenerates them
- sell sheets, line cards and onboarding packets are generated views over the
  first two, same pattern as the Catalog over the image manifest

Metadata schema is lifted from Monti's own filenames rather than invented —
'02091.EU_rev2_[EN] 02.05.2025.pdf' = code · market · revision · language ·
issue date. One current revision per (code, market, docType); superseded
revisions retained. Surfaces two requirements that weren't in the original ask:
market variants and revision control.

Storage mirrors the existing item seam: Cloudinary raw under compliance/, an
index JSON via documents-save/documents-get as items-save/items-get work, behind
the same _write-guard.js admin gate. Documents join by code and deliberately do
NOT route through gatedCode() — that gate is image dispatch.

Hard rule: nutrition, allergen and ingredient values are never AI-composed,
inferred or translated. They carry provenance to a named document revision, are
excluded from every generative surface, and go stale when that revision is
superseded. A wrong allergen is a recall, not a content bug.

Also adds a coverage report requirement — 03044 is at EU rev3 while 03023 has
only USA rev0, and nothing today can report which SKUs lack a current US sheet.

Four open questions logged for Rick, including who transcribes the compliance
data (may add a Quality/Compliance function to CLIENT_DATA_ROLES.md) and the
gatedCode() decision carried over from IMAGE_PIPELINE_SPEC.md.

Also rides along (previously untracked, unrelated):
- SHEET_BANNER_AUTOUPDATE_2026-08-13.md — Apps Script handoff to auto-stamp the
  sheet's 'Updated on:' banner. On hold until Cecilia is back; monti-inventory-watch
  already works around the stale banner via Drive modifiedTime."
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   Check your connection, then re-run this file to push again."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Product Compliance Documents spec is committed and on GitHub."
echo
read -n 1 -s -r -p "Press any key to close..."
