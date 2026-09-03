#!/bin/bash
# Double-click to commit + push (self-healing).
# 1) Clears any stale .git/index.lock left by a sandbox/crashed git process
# 2) Stages everything, commits, pushes (triggers the Netlify deploy)
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

if [ -f .git/index.lock ]; then
  rm -f .git/index.lock && echo "Removed stale .git/index.lock" || echo "Could not remove lock — run: sudo rm '.git/index.lock'"
fi

echo "Staging changes..."
git add -A
echo "Committing..."
git commit -m "Port luxury DTC design research handoff + Content Engine: Affineur's Note pattern (Part F) + Part C unblocked

- docs/HANDOFF_2026-07-19_luxury-dtc-design-research.md + CLAUDE.md/POSITIONING.md pointers
  (earlier same-day porting-in, was sitting uncommitted).
- New: first-person tasting-note slide template (affineurs-note/v1), Studio Director wiring
  (pickTastingNote, optional deck beat), Brand Management editor card, tastingNotesFor() helper.
  Ports one concrete pattern (La Fromagerie's 'affineur's note') from that research into the A1
  Content Engine agent. Stage 0/1 only — no AI, no invented tenant content (tastingNotes ships
  empty everywhere until someone writes one). See docs/AGENT_A1_BUILD_SPEC.md Part F.
- docs/AGENT_A1_BUILD_SPEC.md Part C updated: Anthropic pay-as-you-go billing confirmed live,
  \$25/mo spend cap set, ANTHROPIC_API_KEY created and dropped into Netlify env vars (Builds/
  Functions/Runtime scope, marked secret). Stage 2 AI pass is now unblocked — the Netlify
  function itself (ai-compose.js) is the next build slice, not written yet."
echo
echo "Pushing to GitHub (triggers Netlify deploy)..."
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Pushed. Netlify is building — live in ~1-2 min."
else
  echo "Push failed (status $status). If it asks for a GitHub login, sign in and run again."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
