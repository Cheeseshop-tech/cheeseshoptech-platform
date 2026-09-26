#!/bin/bash
# COMMIT LIFECYCLES — double-click. FIXES THE BROKEN NETLIFY DEPLOY, then ships the lifecycle work.
#
# Netlify's build of 63fe915 failed: "Could not load src/lib/lifecycles.js". Two committed files
# import it; it was never committed. This commit adds it and everything it belongs with.
#
# Sequence, and every step refuses to continue on failure:
#   1. npm test                          (all 7 suites)
#   2. git add <explicit list>
#   3. check-imports --index             the STAGED tree must be complete — the check that
#                                        would have caught today's break
#   4. warn on modified code NOT staged  the other way a hand-typed list goes wrong
#   5. commit
#   6. check-imports --head              the COMMITTED tree must be complete
#   7. push

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat
# pipefail: without it, `git commit ... | cat || stop` checks CAT's exit status, which is always 0,
# so a failed commit would never stop the script. Every COMMIT button written before 2026-09-26
# had that pattern and could not detect a failed commit.
set -o pipefail

stop() {
  echo ""
  echo "  $1"
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
}

echo ""
echo "======================================================================"
echo "  COMMIT LIFECYCLES  —  fixes the failed deploy, ships per-type lifecycles"
echo "======================================================================"
echo ""

npm test || stop "TESTS FAILED — nothing committed, nothing pushed."

echo ""
echo "  Tests pass. Staging…"
echo ""

git add \
  "src/lib/lifecycles.js" \
  "src/lib/checklist-templates.js" \
  "src/lib/campaigns.js" \
  "src/lib/campaign-stages.js" \
  "src/components/campaigns/campaign-detail.jsx" \
  "src/components/campaigns/campaigns-page.jsx" \
  "src/components/campaigns/new-campaign-form.jsx" \
  "src/components/home/command-center.jsx" \
  "netlify/functions/campaign-defs.js" \
  "scripts/test-lifecycles.mjs" \
  "scripts/test-campaign-stages.mjs" \
  "scripts/check-imports.mjs" \
  "package.json" \
  "docs/DESIGN_PER_TYPE_LIFECYCLES_2026-09-26.md" \
  "docs/HANDOFF_2026-09-26_code-review.md" \
  "CLAUDE.md" \
  "DEPLOY TO STAGING.command" \
  "COMMIT LIFECYCLES.command" \
  || stop "git add failed — read above. If it mentions index.lock: rm \"$(pwd)/.git/index.lock\" and re-run."

git --no-pager diff --cached --stat | cat
echo ""

node scripts/check-imports.mjs --index \
  || stop "NOT COMMITTED. The staged files import something that isn't staged — this would break the Netlify build exactly the way 63fe915 did."

UNSTAGED=$(git --no-optional-locks diff --name-only -- src netlify scripts)
if [ -n "$UNSTAGED" ]; then
  echo ""
  echo "  ⚠ Modified code NOT in this commit (will not ship):"
  echo "$UNSTAGED" | sed 's/^/      /'
  echo "  Continuing — but if any of these were meant to ship, close this now."
  echo ""
  read -r -p "  Press Return to continue, or close the window to stop… "
fi

git commit -m "campaigns: per-type lifecycles - Setup, Connect, Execute for distributor campaigns

FIXES THE FAILED NETLIFY DEPLOY OF 63fe915.
That commit shipped campaign-detail.jsx and campaign-state.js importing
src/lib/lifecycles.js, which was never committed. Root cause: its commit
button's file list was written, then two files on it were edited further
before it was run. A button captures files when RUN, not when written.
Every local check passed because every local check reads the working
tree, and the working tree was not what shipped.

NEW GUARD so this cannot recur: scripts/check-imports.mjs reads the tree
from GIT - the index or HEAD - not from disk, so a file that exists
locally but was never added cannot satisfy an import. Proven against the
broken commit (names both files) and the last good one (passes). Wired
into this commit button between staging and committing, and into DEPLOY
TO STAGING as a preflight on exactly what it is about to push.

THE LIFECYCLE WORK (docs/DESIGN_PER_TYPE_LIFECYCLES_2026-09-26.md):

Distributor campaigns move Setup -> Connect -> Execute -> Complete, per
Rick. Everything else keeps draft -> building -> ready -> launched ->
complete, with behaviour asserted unchanged.

Core decision: every lifecycle step declares a KIND - planning, live or
closed - and code outside src/lib/lifecycles.js asks about the kind, never
compares status strings. Nine files compared literals. Adding the new
words the obvious way fails silently in whichever file is forgotten: the
campaign-state sanitizer would have DROPPED \"connect\" and the campaign
would have reverted without a word; the home dashboard would never have
counted a Connect campaign as live. A test now fails the build if a
status-literal comparison appears anywhere outside lifecycles.js - proven
to catch six variants and ignore five safe patterns.

Found and fixed during the build, each of which would have failed silently:
- THE GATE IS A LINE, not a per-step flag. The first draft read `gated`
  per step, so Execute (no flag of its own) was reachable straight from
  Setup, skipping the Connect gate. requiresReadiness() now treats the
  first gated step as a line everything past it sits behind. Reproduces
  the old canAdvanceTo() exactly for generic campaigns (tested).
- THE CALL CONSOLE IS A CAPABILITY. campaign-detail asked
  type === \"enrichment\" in nine places when it meant \"does this campaign
  make calls\". Retyping Ace would have silently removed its ~252-prospect
  call list. hasCallConsole(type) now answers it.
- RETYPING PRESERVES TICKS. Checklist ticks are stored against item ids;
  the distributor template reuses every enrichment id. Tested.
- NO GATE WITHOUT SOMETHING TO TICK. An empty checklist reads as
  not-ready, so a gated type with no template is stuck forever. Every
  gated type is now tested to have required items. Distributor's are the
  five Setup items Rick named plus three carried over from enrichment.
- `calls` is required in enrichment but NOT in distributor - there the
  calls happen IN Connect, so requiring them to enter it would lock the
  campaign in Setup forever.
- New campaigns started at a hardcoded \"draft\" server-side and showed a
  hardcoded \"Starts as Draft\" badge. Both now use the type's first step.
- campaign-defs.js kept its own copy of the type list with a comment
  saying functions cannot import from src/lib. Never true (ai-compose.js
  always has). Types now live in lifecycles.js; the copy is gone.

Moved, verbatim, into pure modules so they can be tested under Node
(campaigns.js cannot load there - it transitively imports a .jsx file):
CAMPAIGN_TYPES -> lifecycles.js, CHECKLIST_TEMPLATES -> checklist-
templates.js. The template move is byte-identical to HEAD apart from the
new distributor template (verified by diff). campaigns.js re-exports both,
so no importer changes. Caught while doing it: mergeCampaign calls
templateFor() locally, and an \`export { x } from\` creates no local
binding - it would have thrown on every campaign load.

ace-fall-show-2026 retyped enrichment -> distributor (Rick's call). Ran
the real seed through mergeCampaign: status resolves to setup, stored
\"building\" also resolves to setup, stored \"launched\" resolves to connect,
existing ticks survive, call console kept, the Connect gate holds, Execute
cannot be skipped to, and close-out stays open. All four other seeded
campaigns come out unchanged.

Distributor is now the FIRST pill (the landing tab). It was always Email,
which is why two enrichment campaigns looked like zero on 2026-09-26; and
the house rule is distributors first. One-line change if wrong.

Stage table rekeyed from array positions to step ids; the rep roster is
primary through Setup AND Connect (Rick: \"necessary for every
distributor-anchored campaign\"). Generic columns asserted unchanged.

Verified before commit: 7 suites green (lifecycles 165, stages 102),
lint 0 errors, every touched file compiles, all five touched functions
bundle, and the WHOLE APP bundles (4.9 MB) - every cross-file import
resolves.

Not in this commit: Execute metrics (new customers counted automatically
needs a baseline snapshot at Setup -> Connect; new items is a manual
count). Step 5 of the design." | cat || stop "Commit failed — read above. Not pushing."

echo ""
node scripts/check-imports.mjs --head \
  || stop "The COMMITTED tree is incomplete. Not pushing — this would break the build."

echo ""
echo "  Pushing…"
echo ""
git push origin phase-2-6-build || stop "PUSH FAILED — read the error above. The commit is safe locally."

echo ""
echo "  Done. Netlify is building — live in ~1-2 min. This should also clear the failed deploy."
echo ""
echo "  TO VERIFY once live:"
echo "    - Campaigns now LANDS on 'Distributor Campaigns'. Ace Fall Show is there."
echo "    - Open it: status reads Setup, the rep roster is near the top, and the"
echo "      header button says 'Start connecting' (greyed, naming what's left)."
echo "    - Its Call console and your prospect list are still there."
echo "    - Email campaigns look and behave exactly as before."
echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
