#!/bin/bash
# Double-click to commit + push: split the Onboarding Engine scope into a real doc set, audit
# development status, and reconcile conflicting scope docs across the platform.
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "docs/onboarding-engine/" \
  "docs/CST_DEVELOPMENT_STATUS_2026-09-07.md" \
  "docs/CST_UNIFIED_DIRECTION_2026-09-07.md" \
  "docs/PROJECT_ROADMAP.md" \
  "docs/PROJECT_STATUS.md" \
  "docs/BUILD_LOG.md" \
  "COMMIT ONBOARDING ENGINE SCOPE REORG.command"

git commit -m "docs: split Onboarding Engine scope, audit dev status, reconcile scope docs

Rick, 2026-09-07: after answering how the Onboarding Engine relates to the
2026-09 hardening roadmap (onboarding is Phase 0, hardening is Phase 2 -- it
tests what onboarding brings in, not a gate ahead of it) and laying out the
real sequence through the ACE Endico Fall Show and into e-commerce, he asked
to (1) separate the actual Onboarding Engine build from every future app
function that had gotten bundled with it in conversation, one doc per section
in one folder, (2) update this build log, (3) get a real development-status
inventory, and (4) reconcile the platform's several scope docs, which by this
point described different, sometimes-conflicting futures.

New docs/onboarding-engine/ folder (8 files): 01-CORE-BUILD.md is the actual
Onboarding Engine (Phase 0, active) -- brand ingestion, voice/design system
extraction, design algorithm, template generation.
07-SALES-OUTREACH-ENRICHMENT-STATUS.md documents the one piece that's already
real (HubSpot CRM, Booth sync, Enrichment Campaigns) and is what gets stress-
tested at the Fall Show. 02 through 06 are the future app functions --
campaign-switching/self-redesigning storefront, operations backbone,
distributor portals, social automation, e-commerce completion -- each graded
honestly (real/partial/scoped/idea-not-scoped) and explicitly marked as NOT
part of the Onboarding Engine itself.

docs/CST_DEVELOPMENT_STATUS_2026-09-07.md is a fresh, whole-platform status
grade (core platform, Onboarding Engine pieces, future app functions,
business/strategy threads), replacing docs/PROJECT_ROADMAP.md (stale since
2026-08-23) and docs/PROJECT_STATUS.md (stale since 2026-06-12) as the
current source of truth. Neither stale doc was deleted or rewritten in
place -- both got a banner pointing to the new docs, kept as real history.

docs/CST_UNIFIED_DIRECTION_2026-09-07.md reconciles PROJECT_ROADMAP.md,
PROJECT_STATUS.md, the 2026-09-03 priority roadmap, the 2026-09-03 hardening
plan, and the Onboarding Engine scope into one sequencing, and explicitly
calls out what's settled (Monti stays the sole proving ground; the Fall Show
is the named accuracy test) versus what's still open (B2B/B2C platform
split; whether onboarding-first reopens the parked multi-tenant hardening
work; human-in-the-loop vs. automatic design algorithm; which non-deck
channel to prove first; billing/accounting scope).

docs/BUILD_LOG.md gets a matching dated entry.

This is a documentation/reconciliation pass only -- no app code changed, no
build to verify. None of the open decisions listed in the unified-direction
doc were resolved here; that's Rick's call, not this pass's job." \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_015LnJm5yyLfXCbcqqrzBxbq"

echo
echo "Pushing..."
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Pushed. New scope docs live under docs/onboarding-engine/, plus"
  echo "docs/CST_DEVELOPMENT_STATUS_2026-09-07.md and docs/CST_UNIFIED_DIRECTION_2026-09-07.md."
else
  echo "Push failed (status $status). If this is the sandbox, that's expected -- double-click"
  echo "this .command file on your own Mac once to finish the push."
fi
echo
read -n 1 -s -r -p "Press any key to close..."
