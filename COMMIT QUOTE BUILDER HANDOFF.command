#!/bin/bash
# COMMIT QUOTE BUILDER HANDOFF — compress the 2026-08-13 build-log entries into one and add the
# handoff doc for the next thread (form function + static appearance). Docs only, no code.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: Quote Builder — compressed log"
echo " + handoff for the next build thread"
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
  "docs/BUILD_LOG.md" \
  "docs/HANDOFF_2026-08-13_quote-builder.md" \
  "COMMIT QUOTE BUILDER HANDOFF.command"
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
git commit -m "docs: compress the Quote Builder build-log entries + add the handoff

Four 2026-08-13 entries (119 lines) folded into one (80), keeping every decision
and its reason: the three arrangements, the quotes-issued log closing
QUOTING_TOOL_PRINCIPLES section 9, the Media Hub asset directive, the sampled
palette, the margin-vs-markup pricing methods, and the open-on-arrival picker.
Notes that the 2026-08-17 Identity migration (32a9da6) later moved quotes.js and
quotes-log.js onto the real guard, so the passcode-era testing notes are stale.

Adds docs/HANDOFF_2026-08-13_quote-builder.md for the next thread: where the
code lives, the measured palette table (do not re-guess it), the Media Hub image
rule, and the open list split into function vs static appearance.

Records the gating issue, measured rather than estimated: the sheet fits ~11
rows on page 1 against the reference's 18, and carries no page-break rules at
all. 40 SKUs renders 2046px against 979px of Letter content. Two causes — story
panels run 200px vs the reference's 132px because we print the full brand-kit
body (61-70 words) where the reference's copy was edited to ~35-40, and 14 of 40
rows wrap Format and Aging onto a second line on long packing strings. Normal
row height already matches the reference exactly at 32px. Open question for the
next session: the table's overflow:hidden (there for the border-radius) may
suppress the thead repeat on page 2 — verify in a real print preview first."
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
  echo "   (A 'fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Handoff is on GitHub."
echo
read -n 1 -s -r -p "Press any key to close..."
