#!/bin/bash
# COMMIT ENRICHMENT SCOPING — double-click. Commits AND pushes, one step.
#
# Runs the test suite FIRST and refuses to commit if it fails. A silent-data-loss fix that ships
# without its tests passing is worse than not shipping it.
#
# Files, named explicitly. No `git add -A`.
#   netlify/functions/campaign-enrichment.js   campaign-scoped store (expand phase)
#   scripts/test-enrichment-scoping.mjs        29 tests
#   package.json                               test:scoping wired into npm test
#   COMMIT ENRICHMENT SCOPING.command          this button

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT ENRICHMENT SCOPING  —  tests, then commit, then push"
echo "======================================================================"
echo ""
echo "  Running the full test suite first…"
echo ""

if ! npm test; then
  echo ""
  echo "  TESTS FAILED — nothing committed, nothing pushed."
  echo "  Read the failures above before changing anything."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "  Tests pass. Staging…"
echo ""

git add \
  "netlify/functions/campaign-enrichment.js" \
  "scripts/test-enrichment-scoping.mjs" \
  "package.json" \
  "COMMIT ENRICHMENT SCOPING.command" || {
  echo "  git add failed — read above."
  echo "  If it says index.lock exists, delete that file and re-run:"
  echo "     rm \"\$(pwd)/.git/index.lock\""
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
}

git --no-pager diff --cached --stat | cat
echo ""

git commit -m "enrichment: scope rows by campaign — stop campaigns overwriting each other

THE BUG. campaign-enrichment stored { entries: { [companyId]: rec } },
keyed by company ALONE. campaignId was written onto the row as a tag but
was never part of the key. So a second campaign enriching a company the
first campaign had already worked overwrote it - buyer, title, email,
phone, address, outcome, all of it. One slot per company, tenant-wide.
The Fall Tasting pass and a spring pass could not both hold a record of
the same account.

Silent, like the note-history bug it sits next to. Nothing errors; a
campaign's call record is just not there any more.

EXPAND PHASE, not the whole migration:
- byCampaign { [campaignId]: { [companyId]: rec } } is now the
  authoritative store. Rows with no campaignId land under \"_shared\" -
  a real bucket, not a discard.
- A save REPLACES the scopes it touches and leaves every other scope
  alone. That is the fix. Replacing within a touched scope preserves the
  existing delete semantics, so a row the client dropped stays dropped.
- entries keeps its exact former meaning: the flat latest-wins view,
  still written on every save, so enrichmentCsv, the crm-push rows,
  campaigns-page and the CRM account card are untouched. Newest wins by
  calledAt rather than by object enumeration order.
- Backfill is LAZY and IDEMPOTENT - seedScopes() promotes legacy rows
  into their campaign bucket on every write, using the campaignId already
  on the row. No migration script to run or forget, no downtime.

WHAT THIS DOES NOT YET DO. campaigns-page still loads the flat entries
map and posts the whole thing back, so the UI still DISPLAYS the
latest-wins row. Data loss is stopped and every campaign's record is
recoverable from byCampaign; surfacing the right one per campaign is the
contract phase, a separate deploy. Do not read this commit as finishing
the job.

29 tests in scripts/test-enrichment-scoping.mjs, wired into npm test.
Covers the two-campaigns-one-company case directly, idempotency of the
backfill, scoped-beats-stale-flat, flatten ordering, and malformed input.

Groundwork for per-campaign discovered fields (Rick, 2026-09-26: \"leave
room for the development and discovery of details per campaign\") - there
was no room, because there was one row." | cat

if [ $? -ne 0 ]; then
  echo ""
  echo "  Commit failed or nothing to commit — read above. Not pushing."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "  Pushing…"
echo ""

if git push origin phase-2-6-build; then
  echo ""
  echo "  Done. Netlify is building — live in ~1-2 min."
  echo ""
  echo "  TO VERIFY IN PRODUCTION, once deployed:"
  echo "    Open a campaign, save one enrichment row, then check the"
  echo "    enrichment GET returns a byCampaign object alongside entries."
  echo "    That first save is also what performs the lazy backfill."
else
  echo ""
  echo "  PUSH FAILED — read the error above. The commit is safe locally."
fi

echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
