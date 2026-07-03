#!/bin/bash
# Double-click to commit + push: 2026-07-02 session close (pricing proposal + logs + handoff).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "docs/PRICING_PROPOSAL_v1.1.md" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "docs/ONBOARDING_AND_AGENTS_SDD.md" \
  "docs/CLIENT_ONBOARDING_GUIDE.md" \
  "COMMIT STUDIO FIT FIX.command" \
  "COMMIT SESSION CLOSE.command" \
  "src/components/presentations/slide-studio.jsx"

git commit -m "docs(session): 2026-07-02 close — pricing proposal v1.1 + logs + handoff

- docs/PRICING_PROPOSAL_v1.1.md (separate numbers doc; structure stays in
  PRICING_AND_ENGAGEMENT_MODEL.md): Stand-Up Month onboarding \$2,500/\$5,000/\$9,500+;
  monthly Portal \$650 / Orchestration \$1,500 (target) / Growth Partner \$3,000;
  buyout N=18; founding-client credit lever; sales motion (demo-tenant showroom ->
  'with YOUR products' -> assembled-alternative anchor -> Stand-Up Month close);
  status PROPOSED - flinch-test on first prospects
- BUILD_LOG: session-close entry (pricing, agent economics: one Max plan + ONE API
  account for all tenants ~\$5-15/mo each, fit-fix live verification, hard-refresh
  lesson)
- HANDOFF: mega-session summary + tomorrow's queue (A1 Content Agent, Rick's HubSpot
  inbox + Anthropic Console wiring, Monti sales history)
- studio: pager clearance in the preview fit (44px) if not already pushed"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Session closed clean — see HANDOFF.md for tomorrow's queue."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
