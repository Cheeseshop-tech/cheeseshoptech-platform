#!/bin/bash
# COMMIT ASIAGO DOP BOOKLET DIGITIZATION — digitizes the Consorzio Tutela Formaggio Asiago's
# own consumer booklet (16 pages, photographed by Rick) into docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md,
# rewrites the copy on all four Asiago signs using the regulator's own sensory language, adds a
# condensed shelf-talker POS format (mockup + engineering handoff), and folds the one finding that
# matters into the existing Cheese Signs open items: the Asiago Vecchio sign ships at 9 months, but
# the regulator's own literature defines "Vecchio" as over 10 months.
# Double-click to commit and push.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Asiago DOP consortium booklet — digitized source"
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
  "docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md" \
  "docs/CHEESE_SIGNS_SPEC.md" \
  "docs/PROJECT_ROADMAP.md" \
  "docs/HANDOFF_2026-08-25_asiago-shelf-talkers.md" \
  "design/asiago-booklet/reference-photos" \
  "design/asiago-shelf-talkers" \
  "src/data/montitrentini/signs.json" \
  "COMMIT ASIAGO BOOKLET DIGITIZATION.command"
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo
echo "NOTE: design/asiago-booklet/source-photos/ (the 16 full-resolution originals, ~50MB) is"
echo "deliberately NOT staged — only the resized/compressed reference-photos/ (~3MB) ships in"
echo "git. The full-res folder is safe to delete by hand if you want the disk space back; it's"
echo "just your own copy, nothing depends on it being there."
echo

echo "Committing..."
git commit -m "Cheese Signs: digitize Asiago booklet, rewrite copy, add shelf-talker POS format

Rick photographed all 16 pages of a consumer booklet published by the Consorzio
Tutela Formaggio Asiago -- the EU-designated regulatory body for the Asiago DOP,
not a retailer or the producer. It is the most authoritative plain-English source
we have on what the designation actually requires.

New: docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md -- full page-by-page transcription
(the EU PDO seal and casein-stamp traceability marks, the Fresco/Stagionato
maturing windows, sensory recognition by sight/smell/taste/feel/chewing for both,
serving/cutting spec, five recipes) plus a reconciliation section against
CHEESE_SIGNS_SPEC.md and signs.json.

The finding that matters: the booklet states Asiago 'Vecchio' requires a maturing
period of OVER 10 MONTHS. The Asiago Vecchio sign -- and the item master behind
it -- ships at 9 months, a month short of the name it carries. This sharpens the
existing 'confirm shipped minimum ages' open item (CHEESE_SIGNS_SPEC.md Sec.9 #2)
into a specific, checkable claim instead of a generic source mismatch. Three ways
it resolves, laid out in the new doc; only Stefano knows which. Also worth fixing
regardless: signs.json's dopMinimum for that record currently reads '9 months
(Vecchio)', which cites the product's own claimed age as its own justification
rather than an actual regulatory minimum.

Also noted: the booklet's photos of the EU PDO seal and the Consorzio's own mark
are useful reference for what the real artwork looks like, but they're phone
photos of a printed page -- not production art. Sec.9 #3 (replace the house-drawn
DOP/mountain badges) still needs real vector files from the consortium.

design/asiago-booklet/reference-photos/ carries the 16 source images, resized to
a 1600px max dimension and JPEG-compressed (51.6MB -> 3.1MB) -- enough to read,
not enough to reprint. Full-resolution originals stay local, untracked.

Also rewrote flavorProfile, unique, shortDescription and longDescription on all
four Asiago sign records (signs.json) using the consortium's own sensory
language -- soft-as-sponge-cake / yoghurt-and-butter aromatics for the Fresco
pair, sweet-like-boiled-chestnut / frankfurter-to-Grana texture for the
Stagionato pair -- instead of house copy. Stagionato's copy now also names the
official "Mezzano" band it falls inside (4-6 months), which is a more specific
and more credible claim than the generic "Stagionato" umbrella term. All four
shortDescription/longDescription fields checked against the sign-templates.js
maxChars caps (165 / 900) after editing -- none exceed them. No age numbers
were touched -- minAge and dopMinimum stay exactly as they were, pending
Stefano's answer on the Vecchio question.

No case-sign template or renderer changes in this commit -- content and spec/roadmap
edits only.

Also new: a condensed shelf-talker POS format for the 4 Asiago signs, a second size alongside
the existing 3x4/4x5 case signs -- single 2.5x3.5in card, no packshot, meant to clip to a shelf
edge or lean against the wedge itself rather than stand behind the whole wheel.

- design/asiago-shelf-talkers/shelf-talker-composition-studio.html -- three fresh layout comps
  (G Green cap, recommended default; H Left rail; I Badge-forward), each shown across all 4
  Asiago cheeses. Comp for Rick to react to, not a locked design.
- docs/HANDOFF_2026-08-25_asiago-shelf-talkers.md -- engineering handoff for porting the chosen
  layout into sign-templates.js as a fifth cheese-sign template (talkerTemplate()), including the
  new optional recognitionCue field the mockup introduces and the same open Stefano blockers.
- design/asiago-shelf-talkers/email-to-stefano-asiago-questions.html -- drafted, NOT sent, email
  to Stefano raising both open blockers (milk treatment + the Vecchio 9-vs-10-month question) in
  one place. Rick to review and send himself.

Still no renderer code touched anywhere in this commit -- the shelf-talker template itself isn't
built yet, only comped and specified." \
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
echo "✅ Pushed. Nothing in the live app changes — this is reference documentation only."
echo "   Next step is a message to Stefano: is Asiago Vecchio really 9 months, or does it age"
echo "   longer than the item master says? docs/ASIAGO_DOP_CONSORTIUM_BOOKLET.md has the detail."
echo
read -n 1 -s -r -p "Press any key to close..."
