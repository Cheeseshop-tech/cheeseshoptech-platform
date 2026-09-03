#!/bin/bash
# Double-click to commit + push: app-wide hardening audit findings (cst-hardening-plan.md).
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "netlify/functions/store-orders.js" \
  "src/lib/store.js" \
  "src/lib/presentations-store.js" \
  "src/lib/media.js"

git commit -m "harden: close store-orders auth gap + 2 more read-failure masking spots

Rick, 2026-09-03: 'get all apps and functions live and hardened' before any new-
client / design-flip work. Audited every netlify/functions/*.js for guard
coverage and every src/lib/*.js fetch() call for the CRM-05 masking pattern.

1) netlify/functions/store-orders.js had NO auth guard at all - unlike its
   sibling store.js (products), which had the identical gap closed 2026-08-21
   (see that file's own AUTH FIX comment). This one is worse: it returns real
   customer names + order totals, not just product data. Harmless only because
   Shopify isn't configured for any live tenant yet - the moment
   SHOPIFY_STORE_DOMAIN/ADMIN_TOKEN get set this would otherwise have been a
   live, completely open read of customer order data. Same requireReadAuth
   guard as store.js now (tenant optional, any signed-in role may read).

2) src/lib/store.js: fetchStoreProducts()/fetchStoreOrders() were never
   sending authHeaders() at all, despite both server functions requiring it -
   every live call would have silently 401'd and fallen back to seed/mock data
   forever, with no visible error (masked by this file's own intentional
   fallback design). Also never triggered in practice (Shopify not configured),
   but 'live mode' would have been permanently indistinguishable from mock the
   moment it was. Fixed by routing both through readAuthedJson().

3) src/lib/presentations-store.js fetchCatalog() (the Content Library / Content
   Studio catalog - directly upstream of the proposal/presentation image work):
   a failed read (non-401, e.g. a 5xx or expired session) fell back to
   { entries: [] }, INDISTINGUISHABLE from a genuinely-empty catalog to the
   legacy-localStorage-migration check right below it. If this browser still
   held pre-Blobs local entries, that migration path fires scheduleSave() - a
   full-document last-writer-wins write - which would have OVERWRITTEN THE REAL
   REMOTE CATALOG with just this browser's stale local cache. The existing
   catch{} block already handled network errors safely (documented 'read-only
   in effect'); the res.ok-false HTTP-failure path just never got the same
   treatment. Now handled identically to catch{} - never touches scheduleSave.

4) src/lib/media.js listAssets() (the older non-paginated sibling of
   listAssetsPage(), which got this exact fix in the 2026-09-03 rollout - still
   used by MediaPicker and studio-director.js, both directly in the path of the
   upcoming image/template work): silently returned [] on any non-401 failure,
   showing an empty picker indistinguishable from 'this tenant truly has no
   images'. Now throws on any failure, matching listAssetsPage(); both existing
   callers already catch and handle this (MediaPicker shows an error state,
   studio-director.js falls back to no-images for its best-effort auto-draft).

Two more spots found and deliberately NOT touched: attention.js/signals.js both
have a live-fetch branch with the same res.ok-ternary shape, but both are gated
behind VITE_ATTENTION_BACKEND/VITE_SIGNALS_BACKEND flags that default to mock
and have no backend function built yet - dead code today, not a live bug. Worth
building these correctly (authHeaders() + readAuthedJson()) from day one
whenever those backends actually get built, not fixing dead code now.

Build clean (2057 modules, same as the last hardening pass)."

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "   Nothing here changes visible behavior (Shopify orders aren't configured;"
  echo "   the masking fixes only change what happens on a FAILURE, which normal"
  echo "   operation never hits). Safe to just let it deploy."
else
  echo "⚠️  Push failed (status $status)."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
