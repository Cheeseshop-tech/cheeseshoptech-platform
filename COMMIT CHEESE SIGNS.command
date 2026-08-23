#!/bin/bash
# COMMIT CHEESE SIGNS — new Content Engine template family: printed retail case signs.
# Adds the spec, the ten Monti Trentini sign records, four template manifests, the icon set,
# and the proof generator. Data + templates only — no renderer or UI changes yet, so nothing
# in the running app moves. Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Cheese Signs v1 (spec, records, templates, icons, proof)"
echo "=============================================="
echo
read -n 1 -s -r -p "Press any key to continue, or Ctrl-C to cancel..."
echo
echo

for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock .git/objects/maintenance.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "docs/CHEESE_SIGNS_SPEC.md" \
  "src/data/montitrentini/signs.json" \
  "src/lib/sign-templates.js" \
  "src/lib/sign-icons.js" \
  "design/cheese-signs/build_proof.py" \
  "design/cheese-signs/icons.py" \
  "design/cheese-signs/monti-trentini-cheese-signs.html" \
  "COMMIT CHEESE SIGNS.command"
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
git commit -m "Cheese Signs v1: printed case-sign template family for the Content Engine

New output type, same engine: a template = a manifest of typed slots on a fixed
canvas, painted from the Brand Kit. The difference is that the canvas is a
physical sheet (100 canvas units per inch) rather than a screen.

Four templates in the new 'cheese-sign' family (src/lib/sign-templates.js):
3x4 and 4x5 inch trim, each in a short mode (short description + packshot) and
a long mode (long description, no photo -- a 3x4 card holds a picture or a
paragraph, not both).

One sign per CHEESE, not per SKU (Rick, 2026-08-23). Each record carries its
skus[] array so the join to the item master and to inventory survives, but the
face sells the cheese and leaves pack format to the order sheet.

Content lives in src/data/montitrentini/signs.json -- ten records: four Asiagos
(Fresco, Fresco di Montagna, Stagionato, Vecchio), four caciottas (truffle,
mountain herbs, black pepper, red chili), Imbriago, and the aged black truffle
Fioretto. Every slot binds to a field; nothing on a face is typed at compose
time. Sources: items-seed.json for SKU/milk/age truth, the producer's own
English pages for description and flavor, inventory.json for stock state.

Icon set (src/lib/sign-icons.js): black-and-white spotted cow for milk type,
three region illustrations (Valsugana, Altopiano di Asiago, Trentino-Veneto),
a house DOP badge and a Product-of-the-Mountain badge. The two badges are
STAND-INS -- swap in the official EU PDO and consortium artwork before any
commercial print run.

design/cheese-signs/ holds the proof generator: it pulls packshots from
Cloudinary, letterboxes them onto white so the whole wheel shows (portion
reality, per the Media Hub rule), generates QR codes offline, and emits a
self-contained printable proof of all 40 faces.

Verified: trim measures exactly 3x4 and 4x5 in; 0 of 40 faces overflow their
fixed height; 10/10 QR codes machine-decode to the intended URL.

Open before printing (docs/CHEESE_SIGNS_SPEC.md section 9): pasteurized vs raw
milk is unknown for every cheese and needs Stefano; shipped minimum ages need
confirming; the QR reaches only FAMILY pages on montitrentini.com because the
producer site has no per-cheese URLs." \
  -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo "   NOTE: a double-clicked .command can fire twice; verify with 'git log' before"
  echo "   believing this message."
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
  echo "   (A 'fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Nothing in the live app changes — this is data, templates and docs only."
echo "   Next build step (spec section 8): teach the manifest renderer the 'qr' slot kind and"
echo "   'showIf' conditional slots, then add a Signs entry to the Content Engine page."
echo
read -n 1 -s -r -p "Press any key to close..."
