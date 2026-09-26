#!/bin/bash
# COMMIT CAMPAIGN FIELDS — double-click. Tests, commits, pushes.
#
# Files, named explicitly. No `git add -A`.
#   netlify/functions/campaign-state.js             `fields` definitions + sanitizer
#   netlify/functions/campaign-enrichment.js        `custom` answers bag
#   src/lib/campaigns.js                            passes fields through mergeCampaign
#   src/components/campaigns/campaign-detail.jsx    the editor + the rendered fields
#   docs/CAMPAIGN_FIELDS_SPEC_2026-09-26.md         the design and the promotion gate
#   COMMIT CAMPAIGN FIELDS.command                  this button

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT CAMPAIGN FIELDS  —  tests, then commit, then push"
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
  "netlify/functions/campaign-state.js" \
  "netlify/functions/campaign-enrichment.js" \
  "src/lib/campaigns.js" \
  "src/components/campaigns/campaign-detail.jsx" \
  "docs/CAMPAIGN_FIELDS_SPEC_2026-09-26.md" \
  "COMMIT CAMPAIGN FIELDS.command" || {
  echo "  git add failed — read above."
  echo "  If it says index.lock exists, delete that file and re-run:"
  echo "     rm \"\$(pwd)/.git/index.lock\""
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
}

git --no-pager diff --cached --stat | cat
echo ""

git commit -m "campaigns: let a campaign declare its own questions, discovered as it runs

Rick, 2026-09-26: \"let's create the system and leave room for the
development and discovery of details per campaign, we can improve as we
go.\"

The enrichment form asks the same five things of every prospect in every
campaign. A campaign discovers its OWN questions while it runs - does this
account already carry a PDO line, who prints their shelf tags - and there
was nowhere to put them. campaign-enrichment has a hard allow-list, so an
unrecognised field was not rejected, it was SILENTLY DROPPED. In practice
the detail went into the free-text note, where nothing can count it.

Definitions live in campaign STATE as fields[] {id,label,type,options},
not in src/lib/campaigns.js. That follows the 2026-08-03 split: campaign
definitions are seeded in code and versioned with it, campaign state is
per-campaign and editable at runtime. A question invented on call nine is
state by that definition - the same kind of thing as custom checklist
items, stored the same way.

Answers live on the enrichment row in a custom{} bag, which works only
because rows became campaign-scoped in ef0414c. Values are stored as
strings whatever the declared type, so changing a field from text to
select mid-campaign does not orphan the answers already collected - and
that WILL happen, because the field is being invented while the campaign
runs.

THE GATE: campaign-declared fields are NEVER promoted to HubSpot. crm-push
does not read custom and must not start. A detail that proves durable
GRADUATES by a deliberate decision - into a real HubSpot property, into
people-fields.js, and the campaign field retires. Without that gate this
is the sixth overlay store guardrail 1 exists to prevent; with it, it is a
nursery where a question proves itself before earning a permanent home.

Caught before shipping: mergeCampaign did not pass fields through, so
c.fields would have been permanently empty and the whole feature silently
inert - the territory-book failure shape exactly.

Design, and the five other deliberate choices (editor beside the call list
not in settings; removing a question keeps its answers; id counter
suffixes; a select with no options refused at both ends; capped at 12):
docs/CAMPAIGN_FIELDS_SPEC_2026-09-26.md

Not done, deliberately: nothing reads the answers back out yet. No report,
no filter, no export column. Guardrail 4 - do not build the screen before
the field it reads is populated." | cat

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
  echo "  TO VERIFY: open a campaign's call console. Above the call list"
  echo "  you should see 'This campaign asks nothing beyond the standard"
  echo "  form' and an 'Add a question' button. Add one, then expand any"
  echo "  call row — it should appear in a dashed box marked 'stays in CST'."
else
  echo ""
  echo "  PUSH FAILED — read the error above. The commit is safe locally."
fi

echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
