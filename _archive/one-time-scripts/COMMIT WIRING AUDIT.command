#!/bin/bash
# Double-click to commit + push: full wiring audit — all domains, closed out.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock && echo "Cleared stale .git/HEAD.lock"

git add \
  "docs/WIRING_AUDIT_2026-07-15.md" \
  "docs/BUILD_LOG.md" \
  "COMMIT WIRING AUDIT.command"

git commit -m "docs: full wiring audit — CRM/Forecast/Brand Kit/Media Hub/Catalog/Proposals/Auth

- New docs/WIRING_AUDIT_2026-07-15.md: read real code (imports, env-flag branches, actual
  callers) instead of trusting the wiring docs, then diffed the two. Three passes: platform
  infra (CRM/Forecast/Brand Kit/Media Hub), Product Catalog/Proposal Engine/Pricing tool, then
  Auth/Roles/House Console/tenant routing. All originally-named domains now covered.
- Finding: platform is wired better than its docs say in most places. CRM (HubSpot direct),
  BSE gating, the BSE Import-kit-JSON button, and the 3-tier passcode system are all live;
  INTEGRATION_WIRING_BRIEF.md, CRM_CONNECTOR.md, CONTENT_ENGINE_WIRING_SPEC.md, and
  AUTH_AND_ROLES.md still describe these as mock/open/single-passcode.
- Corrected mid-audit by Rick: forecast-core.js is meant to run off quarterly sales reports as
  a batch tool, never live order entry -- the Proforma's 'Record sale' button is a rep
  note-taking aid only, not a forecast input. Original 'automate sale capture' suggestion
  struck, kept for the record. Saved as standing memory so it isn't re-proposed.
- Mid-audit: confirmed the sales-monthly.js + build-sales-monthly.mjs seam already existed
  for merging ERP monthly data into forecasting -- it ran against today's new ERP files
  independently during this session (commits b28aa64, 7e18ce5), catching a units bug along
  the way. Gate correctly still closed (2.69% 2024 coverage).
- Catalog/Proposals pass: buyer-catalog.jsx wired correctly to items.js. Proposals and the
  Pricing tool are NOT -- both still read catalog.json's name field, same bug
  studio-director.js had until today's fix, not yet applied here. Bigger finding: proposal
  pricing is deliberately always-live with no freeze -- a reopened proposal link can show a
  silently different price than originally quoted. Real trust/dispute risk, not hypothetical.
  Also confirmed catalog.json's per-SKU image field is fully dead (zero references in src/).
- MOST SERIOUS FINDING: the write-path auth fix shipped 2026-07-06 (items-save.js,
  media-update.js, media-delete.js -- 401 without the right passcode) was never extended to
  reads. crm.js/crm-hubspot.js/crm-summary.js, items-get.js, media-list.js, inventory.js, and
  history.js's POST all have zero server-side auth check today -- a bare function URL returns
  the tenant's CRM data/pricing/inventory, no passcode needed. Filed as new #1 P0 item, ahead
  of everything else. The fix pattern (_write-guard.js's requireWriteAuth()) already exists.
- 12 prioritized improvement suggestions (P0 5, P1 4, P2 3) filed in the audit doc. No code
  changed by any pass -- audit only, by design, so Rick decides what to act on and in what order."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
push_status=$?
echo
if [ $push_status -eq 0 ]; then
  head_now=$(git rev-parse HEAD)
  remote_now=$(git rev-parse origin/phase-2-6-build 2>/dev/null)
  if [ "$head_now" = "$remote_now" ]; then
    echo "✅ Committed and pushed — HEAD matches origin/phase-2-6-build ($head_now)."
  else
    echo "⚠️  git push exited 0 but HEAD ($head_now) != origin ($remote_now). Check manually."
  fi
else
  echo "⚠️  Push failed (status $push_status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
