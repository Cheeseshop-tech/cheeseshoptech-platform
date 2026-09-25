#!/bin/bash
# CREATE CRM PROPERTIES — double-click to add the five people-spine fields to HubSpot.
#
# Contract: docs/PEOPLE_DATA_OWNERSHIP.md
#   Company: Relationship · Outreach stage · Territory
#   Contact: Contact role · Territory
#
# The token is typed in, used for this run only, and never written to disk — same pattern as
# VALIDATE ITEMS LIVE.command. Safe to run more than once: existing properties are skipped.

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  CREATE CRM PROPERTIES  —  5 fields, HubSpot"
echo "======================================================================"
echo ""
echo "  BEFORE YOU RUN THIS, the private app needs two scopes it does not"
echo "  have yet. In HubSpot:"
echo ""
echo "     Settings (gear) -> Integrations -> Private Apps -> your app"
echo "     -> Edit app -> Scopes -> Add new scope"
echo "     -> search 'schemas', tick BOTH:"
echo "            crm.schemas.companies.write"
echo "            crm.schemas.contacts.write"
echo "     -> Commit changes   (ticking alone does not save)"
echo ""
echo "  Then paste the private app's ACCESS TOKEN below. It starts 'pat-'."
echo "  Find it on the same app page under the 'Auth' tab -> Access token"
echo "  -> Show token -> Copy. Nothing is saved to disk."
echo ""
read -r -s -p "  HubSpot private app token: " HUBSPOT_TOKEN
echo ""

if [ -z "$HUBSPOT_TOKEN" ]; then
  echo ""
  echo "  No token entered — nothing was changed."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

export HUBSPOT_TOKEN
node scripts/create-crm-properties.mjs
STATUS=$?
unset HUBSPOT_TOKEN

echo ""
if [ $STATUS -eq 0 ]; then
  echo "======================================================================"
  echo "  Done. Check one record to see the fields:"
  echo "  HubSpot -> Contacts -> Companies -> open Eataly -> scroll the"
  echo "  left-hand property panel for Relationship / Outreach stage / Territory"
  echo "======================================================================"
else
  echo "  Something failed above — read the line marked 'x'."
  echo "  A 403 means the two schema scopes are missing or were not committed."
  echo "  Nothing partial is left behind: properties either exist or they don't."
fi
echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
