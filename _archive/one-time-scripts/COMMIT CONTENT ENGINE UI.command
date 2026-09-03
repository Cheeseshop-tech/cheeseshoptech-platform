#!/bin/bash
# Double-click to commit + push: Content Engine reorg + dashboard priority window + coming-soon login.
cd "$(dirname "$0")" || exit 1

# Self-heal any stranded sandbox lock first (sandbox can create but not delete it).
[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

# BSE integrated INTO the app (behind the gate) — remove the old ungated public copy.
# (Sandbox can't delete on the mount; this runs on the Mac, which can.)
[ -d "public/tools/brand-systems-engine" ] && git rm -r -q "public/tools/brand-systems-engine" && echo "Removed public BSE copy (now gated in-app)"

git add \
  "src/App.jsx" \
  "src/lib/icons.js" \
  "src/lib/attention.js" \
  "src/data/montitrentini/attention.json" \
  "src/components/home/home-hub.jsx" \
  "src/components/home/command-center.jsx" \
  "src/components/home/priority-card.jsx" \
  "src/components/tools/content-engine-page.jsx" \
  "config/clients/montitrentini.json" \
  "public/coming-soon/index.html" \
  "public/coming-soon/_redirects" \
  "public/series/queso-couture/index.html" \
  "src/assets/brand-systems-engine.html" \
  "src/components/brand/brand-systems-page.jsx" \
  "src/components/marketing/coming-soon.jsx" \
  "netlify.toml" \
  "docs/CONTENT_ENGINE_WIRING_SPEC.md" \
  "docs/DOMAIN_CONSOLIDATION_RUNBOOK.md" \
  "docs/PLATFORM_SIDES_SPEC.md" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT CONTENT ENGINE UI.command"

git commit -m "feat(ui): Content Engine reorg + dashboard priority window + coming-soon login

- Tools nav -> CONTENT ENGINE: new content-engine-page.jsx with per-app cards
  (Content Studio / Content Library / Brand Systems / Brand Kits / Brand Voice / Media Hub);
  their top-level tabs removed, routes kept reachable (NON_NAV_PAGES); Brand kits render
  role-gated; Media hub tab kept for external collaborator roles only
- Dashboard leads with operations: Pricing & Inventory, CRM, Trade Portal, Campaigns
  (new campaigns tool card, megaphone icon); Media hub card moved off the dashboard grid
- Priority window: 'Priority - response needed' card (urgent emails / deadline tasks) via
  new lib/attention.js seam (VITE_ATTENTION_BACKEND, mock bundle attention.json)
- At a glance order: Opportunities -> Active campaigns -> Market news -> rest
- Coming-soon page: quiet Log in link + /login 302 to the platform house gate
  (re-drop public/coming-soon/ on the 'cheeseshoptech' Netlify site to go live)
- docs/CONTENT_ENGINE_WIRING_SPEC.md: Studio Director intelligence spec (Stages 0-3)
- sidebar order: Dashboard / Pricing & Inventory / CRM / Campaigns / Orders / Content Engine /
  Storefront (NAV_ORDER); Catalog off the sidebar, reachable via its dashboard card
- back buttons on branched pages: Brand Systems Engine + Queso Couture (house rule)
- ONE ADDRESS: apex now serves ComingSoon + Sign in from the platform site (LandingPage
  kept for launch); DOMAIN_CONSOLIDATION_RUNBOOK.md = Rick's DNS steps to retire the Drop site
- PLATFORM_SIDES_SPEC.md: CST agency side (template build apps + onboarding tools) vs
  client side (functional apps + proprietary data/brand system) + wiring board
- BSE INTEGRATED + GATED: engine HTML moved into the app bundle (src/assets, lazy ?raw,
  iframe srcDoc) as internal route brand-systems under Content Engine; role-gated
  admin/client-admin; ungated public /tools/brand-systems-engine/ REMOVED (closes open item)"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Netlify is building — live in ~1–2 min."
  echo "NOTE: the coming-soon Log in link goes live only after you re-drop public/coming-soon/"
  echo "      onto the 'cheeseshoptech' Netlify Drop site (it is not git-connected)."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
