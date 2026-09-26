#!/bin/bash
# COMMIT PEOPLE SPINE PROPERTIES — double-click to commit the HubSpot property spec + script fix.
#
# What this commits:
#   docs/HUBSPOT_PROPERTY_SPEC.md       NEW — as-built spec for the five people-spine properties
#   docs/PEOPLE_DATA_OWNERSHIP.md       step 1 marked done
#   scripts/create-crm-properties.mjs   TERRITORIES updated to the as-built ten
#
# Nothing here touches HubSpot. The properties were built by hand and verified by API.

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT PEOPLE SPINE PROPERTIES"
echo "======================================================================"
echo ""

git add \
  "docs/HUBSPOT_PROPERTY_SPEC.md" \
  "docs/PEOPLE_DATA_OWNERSHIP.md" \
  "scripts/create-crm-properties.mjs"

echo "  Staged:"
git --no-pager diff --cached --stat | cat
echo ""

git commit -m "docs: as-built spec for the five HubSpot people-spine properties

Built by hand in the HubSpot UI on 2026-09-25 and verified by API. The
private app cannot be granted crm.schemas.companies.write /
crm.schemas.contacts.write on this portal, so create-crm-properties.mjs
403s; it stays as the machine-readable definition, not a runnable path.

Company: relationship (4) - outreach_stage (7) - territory (10)
Contact: contact_role (5) - territory (10)

Both Territory lists verified identical string-for-string. That join is a
plain string match, so a mismatch returns nothing rather than erroring.

HUBSPOT_PROPERTY_SPEC.md records the two UI traps that cost the most time:
an option's internal value is write-once (rename the label all you like,
the stored value never moves), and the options table lives on the Field
type TAB inside the editor, not on the property preview.

TERRITORIES in create-crm-properties.mjs updated from the original 8 to
the as-built 10 - Philadelphia/PA and Southeast/FL are separate options.

PEOPLE_DATA_OWNERSHIP.md step 1 marked done. Step 2 next: mark
relationship on the ~20 accounts with real email traffic." | cat

STATUS=$?
echo ""
if [ $STATUS -eq 0 ]; then
  echo "  Committed. Run DEPLOY TO STAGING.command to push."
else
  echo "  Commit failed or there was nothing to commit - read above."
fi
echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
