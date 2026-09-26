#!/bin/bash
# COMMIT PEOPLE PICKERS — double-click. Tests, commits, pushes.
#
# Runs npm test FIRST and refuses to commit if anything fails.
#
# Files, named explicitly. No `git add -A`.
#   src/lib/people-fields.js                          ONE definition of the five vocabularies
#   scripts/test-people-fields.mjs                    38 tests against the as-built HubSpot values
#   netlify/functions/campaign-enrichment.js          accepts + validates the three new fields
#   netlify/functions/crm-push.js                     promotes them to HubSpot
#   src/components/campaigns/campaign-detail.jsx      the pickers themselves
#   package.json                                      test:fields wired into npm test
#   COMMIT PEOPLE PICKERS.command                     this button

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT PEOPLE PICKERS  —  tests, then commit, then push"
echo "======================================================================"
echo ""

if ! npm test; then
  echo ""
  echo "  TESTS FAILED — nothing committed, nothing pushed."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "  Tests pass. Staging…"
echo ""

git add \
  "src/lib/people-fields.js" \
  "scripts/test-people-fields.mjs" \
  "netlify/functions/campaign-enrichment.js" \
  "netlify/functions/crm-push.js" \
  "src/components/campaigns/campaign-detail.jsx" \
  "package.json" \
  "COMMIT PEOPLE PICKERS.command" || {
  echo "  git add failed — read above."
  echo "  If it says index.lock exists, delete that file and re-run:"
  echo "     rm \"\$(pwd)/.git/index.lock\""
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
}

git --no-pager diff --cached --stat | cat
echo ""

git commit -m "people spine: capture contact_role, territory and relationship where the work happens

The five HubSpot properties were built by hand on 2026-09-25 and then sat
unreachable: nothing in the app could write them, so nothing populated
them. That is the territory-book failure in slow motion - a field nobody
can reach does not get filled, and the screen that reads it looks broken.

Three pickers in the call console, stored through campaign-enrichment and
promoted to HubSpot by crm-push:
  Contact role        dropdown   -> Contact.contact_role
  Territory           checkboxes -> Contact.territory / Company.territory
  Account relationship dropdown  -> Company.relationship

NOT a bulk backfill, deliberately. Rick, 2026-09-26: \"why not just have
the clickable option in a dropdown so we select as we enrich the contact
and relationship.\" Setting contact_role on ~100 distributor contacts from
job titles and email domains would have been inference presented as fact -
the error guardrail 2 forbids for relationship, one object down. The value
arrives attached to the moment someone actually knew it.

src/lib/people-fields.js is the single definition of all five
vocabularies, imported by the form, the store and the push. These option
strings were typed by hand twice on 2026-09-25 and four of them drifted
(FLorida, South East, REP, and an option stored as \"Not a fit\" while
labelled \"Lost\"); because a HubSpot option's internal value is
WRITE-ONCE, each one cost a property rebuild. Defining them twice in code
would reintroduce exactly that. 38 tests assert they still match the
as-built portal values, that the two territory lists are identical (the
rep-to-account join is a plain string match, so a mismatch returns nothing
forever rather than erroring), and that multi-select serialises with
semicolons the way HubSpot expects rather than commas.

Three deliberate refusals:
- An unset picker is OMITTED from the payload, never sent as \"\". A push
  must not blank a value someone set by hand in HubSpot.
- A value outside the vocabulary is dropped at capture, where the rep can
  see the picker did nothing, rather than surviving to fail a batch push.
- crm-push re-validates even though capture already did, because it
  accepts a posted body and cannot assume the rows came that way.

KNOWN GAP, not a bug: crm-push only accepts rows with an email AND a buyer
name, so an account where ONLY relationship was set does not promote. That
field is settable directly in HubSpot and 30 accounts were set there on
2026-09-26. Relaxing the filter to allow company-only rows is a separate
change to a live write path." | cat

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
  echo "  TO VERIFY: open a campaign, expand a call row, and confirm the"
  echo "  three new controls appear under the address block. Set one, then"
  echo "  DRY RUN the HubSpot push — the plan should list the values before"
  echo "  anything is written. Do not commit the push until the dry run"
  echo "  looks right."
else
  echo ""
  echo "  PUSH FAILED — read the error above. The commit is safe locally."
fi

echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
