#!/bin/bash
# CREATE CRM PROPERTIES — RETIRED 2026-09-25. This button cannot work and no longer tries.
#
# It asked for a HubSpot token and POSTed five property definitions. That requires
# crm.schemas.companies.write / crm.schemas.contacts.write, which are NOT offered in this
# portal's private-app scope picker. Every call returned 403. The properties were built by hand
# in the HubSpot UI instead, on 2026-09-25, and verified by API.
#
# scripts/create-crm-properties.mjs is KEPT as the machine-readable definition of what these
# five properties are — names, types, option lists. It is documentation that happens to be
# executable, not a path anyone should run. If HubSpot ever exposes those scopes, restore this
# button from git history.

cd "$(dirname "$0")" || exit 1

cat <<'EOF'

======================================================================
  CREATE CRM PROPERTIES  —  RETIRED
======================================================================

  This button does nothing. It cannot work.

  Creating HubSpot properties over the API needs two scopes:
      crm.schemas.companies.write
      crm.schemas.contacts.write
  Neither is offered in this portal's private-app scope picker, so
  every attempt returns 403. Not a configuration mistake - there is
  no configuration that fixes it.

  THE FIVE PROPERTIES ALREADY EXIST. Built by hand in the HubSpot UI
  on 2026-09-25 and verified by API:

      Company  relationship     4 options
      Company  outreach_stage   7 options
      Company  territory       10 options
      Contact  contact_role     5 options
      Contact  territory       10 options   (identical list to Company)

  To change them, or to build the same set in another portal:
      docs/HUBSPOT_PROPERTY_SPEC.md     as-built spec + the UI traps
      scripts/create-crm-properties.mjs machine-readable definition

  Two traps that cost the most time, repeated here so they are not
  rediscovered:
    - An option's INTERNAL VALUE is write-once. Renaming the label
      never moves the stored value.
    - The options table lives on the "Field type" TAB inside the
      property editor. Clicking a property's name opens a read-only
      preview, which is not the editor.

EOF

read -n 1 -s -r -p "Press any key to close..."
echo ""
