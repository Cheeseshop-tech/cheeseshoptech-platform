#!/bin/bash
# Double-click, one-time setup: saves your AGENT_GATE_PASSCODE into
# scripts/.improvement-review-publish.json (gitignored — never committed) so the weekly
# improvement-review task can publish to the Command Center without a human typing anything.
#
# The passcode you type here stays on THIS machine — it's written straight to the local
# gitignored file, never printed, never sent anywhere else, never seen by Claude.
cd "$(dirname "$0")" || exit 1

echo "This sets up scripts/.improvement-review-publish.json so the weekly improvement"
echo "review can publish to the Command Center on its own."
echo
echo "Find your AGENT_GATE_PASSCODE value in Netlify: Site settings -> Environment variables."
echo
read -r -s -p "Paste your AGENT_GATE_PASSCODE value (hidden as you type), then press Enter: " PASSCODE
echo
echo

if [ -z "$PASSCODE" ]; then
  echo "✗ Nothing entered — nothing saved. Run this again when you have the value handy."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

mkdir -p scripts
cat > scripts/.improvement-review-publish.json <<EOF
{
  "url": "https://cheeseshoptech-platform.netlify.app/.netlify/functions/improvement-review",
  "secret": "$PASSCODE"
}
EOF

echo "✓ Saved scripts/.improvement-review-publish.json (gitignored, stays local to this Mac)."
echo
echo "Publishing this week's review to the Command Center now…"
node scripts/publish-improvement-review.mjs
status=$?
echo
if [ $status -eq 0 ]; then
  echo "✅ Done. Reload the Agency Console — the 'Weekly improvement review' panel should show this week's data."
else
  echo "⚠️  Publish failed (exit $status). Likely means the passcode you entered doesn't match"
  echo "    AGENT_GATE_PASSCODE in Netlify's environment variables — double-check it there and re-run this."
fi
echo
read -n 1 -s -r -p "Press any key to close…"
