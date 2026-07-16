#!/bin/bash
# Double-click to commit + push: full wiring audit across CRM/Forecast/Brand Kit/Media Hub.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"
[ -f .git/HEAD.lock ] && rm -f .git/HEAD.lock && echo "Cleared stale .git/HEAD.lock"

git add \
  "docs/WIRING_AUDIT_2026-07-15.md" \
  "docs/BUILD_LOG.md" \
  "COMMIT WIRING AUDIT.command"

git commit -m "docs: full wiring audit — CRM/Forecast/Brand Kit/Media Hub vs. actual code

- New docs/WIRING_AUDIT_2026-07-15.md: read real code (imports, env-flag branches, actual
  callers) instead of trusting the wiring docs, then diffed the two.
- Finding: platform is wired better than its docs say. CRM (HubSpot direct), BSE gating, and
  the BSE Import-kit-JSON button are all live; INTEGRATION_WIRING_BRIEF.md, CRM_CONNECTOR.md,
  and CONTENT_ENGINE_WIRING_SPEC.md still describe these as mock/open.
- Real gap: forecast-core.js is genuine wired infrastructure (Pricing Tool Movement tab), but
  the only path from a real sale into it is a manual 'Record sale' click -- no automated
  capture.
- Mid-audit: confirmed the sales-monthly.js + build-sales-monthly.mjs seam already existed
  for merging ERP monthly data into forecasting -- it ran against today's new ERP files
  independently during this session (commits b28aa64, 7e18ce5), catching a units bug along
  the way. Gate correctly still closed (2.69% 2024 coverage).
- 9 prioritized improvement suggestions (P0-P2) filed in the audit doc. No code changed."

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
