#!/bin/bash
# COMMIT PRESENTATIONS CATALOG — Load presentation + Share on the Presentations page.
# Presentations becomes a catalog of finished proposals (localStorage), each with Open/Share/Remove.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit Presentations catalog (Load + Share) ──"

rm -f .git/*.lock          # clear stale index.lock AND HEAD.lock

git add -A \
  src/lib/presentations-store.js \
  src/components/presentations/presentations-page.jsx \
  src/lib/cloudinary.js

git commit -m "feat(presentations): catalog of finished proposals — Load (URL/upload/drag-drop) + Share

Presentations is now a catalog. presentations-store.js: per-tenant localStorage catalog
(addEntry/removeEntry, mirrors brand-kit-edits). cloudinary.js: uploadFileAuto() — unsigned
/auto/upload for PDF/PPTX/images (images downscaled, raw passes through). PresentationsPage:
'Load presentation' dialog accepts a pasted URL OR browse-files OR drag & drop (PDF/PPTX/image);
each card gets Open, Share (Web Share API -> clipboard), admin Remove. PPTX stored+shareable
(download to open). Config image decks still play in the built-in viewer. Build clean."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && echo "Pushed — Netlify will rebuild." || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
