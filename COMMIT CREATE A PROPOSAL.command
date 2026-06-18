#!/bin/bash
# COMMIT CREATE A PROPOSAL — rename Proposals → "Create a Proposal" + print-to-PDF export.
# Adds a print stylesheet so the proposal exports as a clean, brand-correct PDF (no app chrome,
# backgrounds render, no mid-element page breaks). Sharing/email stays in the Presentations tab.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · commit Create a Proposal (PDF export) ──"

rm -f .git/*.lock          # clear stale index.lock AND HEAD.lock

git add -A \
  src/index.css \
  src/App.jsx \
  src/components/proposals/proposal-builder.jsx \
  src/components/proposals/proposal-view.jsx

git commit -m "feat(proposals): rename to 'Create a Proposal' + print-to-PDF export

Nav + headings renamed Proposals -> Create a Proposal. proposal-view Export PDF button
(window.print) now backed by a real @media print stylesheet in index.css: isolates the
.proposal-print subtree (hides app chrome), forces print-color-adjust:exact so themed cover/
closing/zone backgrounds render, @page 14mm margins, break-inside:avoid on product rows/cards/
story blocks. Hint points users to Presentations to share/email. Build clean."

echo ""
echo "Committed. Pushing to staging…"
git push origin phase-2-6-build && echo "Pushed — Netlify will rebuild." || echo "Push failed — ask Claude for help."

echo ""
read -r -p "Press Return to close…"
