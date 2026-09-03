#!/bin/bash
# MARKET NEWS — GO LIVE (one double-click, end to end).
#
# Everything else is already done and deployed:
#   8fa1cb8  both Netlify functions + both publish scripts   -> LIVE on origin
#   VITE_MARKETNEWS_BACKEND = function                       -> SET (context: all)
#   scripts/.market-news-publish.json                        -> WRITTEN (0600, gitignored)
#
# The ONE thing missing: MARKETNEWS_PUBLISH_SECRET exists in Netlify but its value is
# empty ("0 values in 0 deploy contexts"), because the UI was on "Different value for each
# deploy context" and no box was filled. The function does `if (!secret) return 503`, so it
# reports "not configured" from a variable that looks present.
#
# THIS SCRIPT:
#   1. reads the secret from your local scripts/.market-news-publish.json (never prints it)
#   2. writes it into Netlify as MARKETNEWS_PUBLISH_SECRET for ALL deploy contexts
#   3. triggers a production deploy (functions only pick up env changes on a new deploy)
#   4. waits until the live endpoint stops saying 503
#   5. publishes the 11-item brief into Netlify Blobs
#
# FIRST RUN ONLY: it will open a browser once for `netlify login`. That is Netlify's own
# OAuth page — you approve it, nothing is typed by anything but you.
#
# The secret is never printed, never logged, and never leaves this machine except to Netlify.
#
# Double-click to run.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

SITE_ID="b9d021b1-7a21-4183-81a2-f1be6669b682"
CFG="scripts/.market-news-publish.json"
PUBLISH_URL="https://cheeseshoptech-platform.netlify.app/.netlify/functions/market-news-publish"
NTL="npx --yes netlify-cli@latest"

echo "==================================================="
echo " MARKET NEWS — GO LIVE"
echo "==================================================="
echo

# ---------- 1. local secret ----------
if [ ! -f "$CFG" ]; then
  echo "❌ $CFG not found. Nothing to publish with."
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
SECRET=$(python3 -c "import json,sys;s=json.load(open('$CFG')).get('secret','');sys.stdout.write(s)")
if [ ${#SECRET} -ne 64 ]; then
  echo "❌ secret in $CFG is ${#SECRET} chars, expected 64. Not proceeding."
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "✓ local secret loaded (${SECRET:0:6}…${SECRET: -4}) — value is never printed in full"
echo

# ---------- 2. netlify auth ----------
echo "Checking Netlify CLI login (first run downloads the CLI — can take a minute)..."
if ! $NTL status >/dev/null 2>&1; then
  echo "  Not logged in. Opening Netlify's login page in your browser..."
  $NTL login || { echo "❌ netlify login failed."; read -n 1 -s -r -p "Press any key to close..."; exit 1; }
fi
echo "✓ Netlify CLI authenticated"
echo

# ---------- 3. set the env var ----------
echo "Setting MARKETNEWS_PUBLISH_SECRET for all deploy contexts..."
if ! $NTL env:set MARKETNEWS_PUBLISH_SECRET "$SECRET" --secret --site "$SITE_ID" >/dev/null 2>&1; then
  echo "  --secret flag rejected; retrying without it..."
  $NTL env:set MARKETNEWS_PUBLISH_SECRET "$SECRET" --site "$SITE_ID" >/dev/null 2>&1 || {
    echo "❌ Could not set the variable. Set it by hand:"
    echo "   Netlify -> cheeseshoptech-platform -> Project configuration -> Environment variables"
    echo "   MARKETNEWS_PUBLISH_SECRET -> Options -> Edit -> 'Same value for all deploy contexts' -> paste -> Save"
    read -n 1 -s -r -p "Press any key to close..."; exit 1; }
fi
echo "✓ variable set"
echo

# ---------- 4. redeploy ----------
echo "Triggering a production deploy (functions read env only at deploy time)..."
if ! $NTL api createSiteBuild --data "{\"site_id\":\"$SITE_ID\"}" >/dev/null 2>&1; then
  echo "⚠️  Could not trigger the build from here."
  echo "   Do it in the UI: Deploys -> Trigger deploy -> Deploy project, then re-run this file."
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo "✓ build triggered"
echo

# ---------- 5. wait for the secret to go live ----------
echo "Waiting for the deploy (checking every 8s, up to 8 min)..."
LIVE=0
for i in $(seq 1 60); do
  R=$(curl -s -m 10 -X POST -H "Content-Type: application/json" -d '{}' "$PUBLISH_URL" 2>/dev/null || true)
  case "$R" in
    *Unauthorized*) echo "✓ secret is LIVE after ~$((i*8))s"; LIVE=1; break ;;
    *) printf "." ; sleep 8 ;;
  esac
done
echo
if [ "$LIVE" -ne 1 ]; then
  echo "⏱ Still not live after 8 min. Last response:"
  echo "   $R"
  echo "   Check Deploys for a failed build, then re-run this file."
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi
echo

# ---------- 6. publish the brief ----------
echo "Publishing the market-news brief into Blobs..."
python3 scripts/publish_market_news.py
RC=$?
echo
if [ $RC -ne 0 ]; then
  echo "❌ publish failed (exit $RC) — see the message above. The secret IS live; this is a payload issue."
  read -n 1 -s -r -p "Press any key to close..."; exit 1
fi

echo "==================================================="
echo " ✅ MARKET NEWS IS LIVE"
echo "==================================================="
echo
echo "   Reload the portal dashboard. The Market News card should now show a"
echo "   freshness chip instead of the grey 'Sample' badge, and the Agency Console's"
echo "   Market News probe should read green with the item count."
echo
echo "   Note: the newest headline is dated 2026-08-28, so the chip will read"
echo "   'Updated 4 days ago' — that is the honest-freshness behaviour, not a failure."
echo
read -n 1 -s -r -p "Press any key to close..."
