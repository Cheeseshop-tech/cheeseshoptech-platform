#!/bin/bash
# Double-click to commit + push: hardening plan Part A items 2 + 4 (shared authed-fetch
# helper, proactive session-health check). Sentry (item 3) and the read-failure rollout
# (item 1) already shipped separately.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/lib/authed-fetch.js" \
  "src/lib/crm.js" \
  "src/lib/campaigns.js" \
  "src/lib/auth-context.jsx"

git commit -m "harden(data,auth): shared authed-fetch helper + proactive session check

Part A item 2 of the CRM-05 hardening plan: item 1 (2026-09-03) fixed the read-
failure-masking pattern by hand in 9 files, but every fix still hand-rolled
'fetch(...) + authHeaders() + if (!res.ok)' itself, which is exactly how the
original bug got introduced in the first place. New src/lib/authed-fetch.js adds
two narrow helpers - readAuthedJson() (GET, resolves the parsed body or a failure
sentinel, never throws) and writeAuthedJson() (POST/DELETE/etc, resolves
{ok, status, ...data}, never throws) - so a new read/write call site can't
reintroduce the masking pattern by construction; the failure branch lives in one
place instead of being retyped (and potentially gotten wrong) per call site.

Migrated crm.js (getCrmData, getOutreach, saveOutreach) and campaigns.js (all 11
read/write call sites: getSourcedCampaigns, getCampaignDefs/deleteCampaign/
createCampaign, getCampaignState/saveCampaignState, getEnrichment/saveEnrichment,
getRepCalls/saveRepCalls, pushToHubspot) onto the shared helpers - these were the
two files with the most repeated call sites and the highest business risk (the
overlay autosave stores). Behavior is unchanged for every caller; this is a pure
refactor onto a safer foundation, build-verified (2057 modules, up one from 2056
for the new file). getCrmData() also picks up a latent fix as a side effect: its
fetch was never wrapped in try/catch, so a genuine network error (not just a
non-200) would have rejected instead of resolving null like every other read in
this file - readAuthedJson() catches that uniformly now.

prices.js and media.js were deliberately left on their own hand-fixed shapes (a
priceListSource/unavailable flag baked into the read result, and a throw-on-any-
failure contract, respectively) rather than force-fit onto the generic helper -
both are already correct from item 1 and don't share the same repeated shape as
crm.js/campaigns.js, so migrating them isn't worth the churn risk today.

Part A item 4: auth-context.jsx's AuthProvider now verifies the Identity session
is still real on mount AND whenever the tab regains focus (await user.jwt(), which
refreshes if near expiry and throws if the refresh token is actually dead), not
just when a read/write happens to 401 mid-render. A session that's died server-side
(revoked, user deleted, refresh token expired) now drops the user back to the
existing LoginScreen gate (require-auth.jsx) proactively instead of the tab
silently breaking on the next fetch - the same failure shape CRM-05 was. No-op in
dev bypass and passcode mode (no real Identity session to verify there).

Not started yet: A5 (external synthetic-check tripwire) and Part B (the tenant/
role-model flexibility work, and retiring the legacy per-tenant passcode env vars)
- Part B changes live auth/permission logic and gets its own review before any
code gets written, not bundled into a background pass. See cst-hardening-plan.md."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "   Nothing here should change how anything LOOKS or behaves — it is a refactor"
  echo "   plus a new proactive sign-out-on-dead-session check. Worth a quick pass on"
  echo "   the CRM tab, Campaigns tab, and just generally staying signed in normally."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
