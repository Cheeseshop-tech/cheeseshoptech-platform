#!/bin/bash
# Double-click to commit + push: Pricing & Inventory data-intake state (real app, Google Drive delivery).
cd "$(dirname "$0")" || exit 1

[ -f .git/index.lock ] && rm -f .git/index.lock && echo "Cleared stale .git/index.lock"

git add \
  "src/components/tools/pricing-tool.jsx" \
  "docs/BUILD_LOG.md" \
  "HANDOFF.md" \
  "COMMIT PRICING INTAKE.command"

git commit -m "feat(pricing): data-intake state when the catalog is empty — real app, not a mock

- PricingTool: when a tenant's catalog has zero products, the SAME encoded app renders
  its data-connection state (new DataIntake panel) instead of empty tabs
- 3-step intake: download the preferred-format templates (01 catalog+pricing /
  02 inventory weekly / 03 commitments, served from /onboarding-kit/) -> fill in
  Excel or Google Sheets -> share a Google Drive folder (view access) with
  hello@cheeseshoptech.com — the shared file IS the pipeline, same weekly-sync
  delivery process as live tenants; portal populates when data lands
- explicitly notes in-app upload as roadmap; shared-Drive is the standard until a
  client's workflow needs different (Rick, 2026-07-02)"

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Pushed. Verify: ?client=demo → Pricing & Inventory → intake panel with template downloads."
else
  echo "⚠️  Push failed (status $status). Try 'FIX GIT LOCK AND PUSH.command'."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
