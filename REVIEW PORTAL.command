#!/bin/bash
# REVIEW PORTAL — double-click to preview the CheeseShop TECH platform locally.
# Starts the Vite dev server (passcode: monti) and opens the Monti portal in your browser.
# Stop it: close this Terminal window or press Ctrl+C.

cd "$(dirname "$0")" || exit 1
echo "── CheeseShop TECH · local review ─────────────────────────"

# 1. Find Node (PATH → Claude Code bootstrap → Homebrew → nvm), else download a local copy.
find_node() {
  command -v node >/dev/null 2>&1 && { echo "$(dirname "$(command -v node)")"; return; }
  for d in /tmp/node-v22*/bin /opt/homebrew/bin /usr/local/bin "$HOME"/.nvm/versions/node/*/bin; do
    [ -x "$d/node" ] && { echo "$d"; return; }
  done
}
NODE_BIN="$(find_node)"
if [ -z "$NODE_BIN" ]; then
  echo "Node not found — downloading a private copy (~50 MB, one time)…"
  ARCH=$(uname -m); [ "$ARCH" = "arm64" ] && PKG="darwin-arm64" || PKG="darwin-x64"
  curl -fsSL "https://nodejs.org/dist/v22.18.0/node-v22.18.0-$PKG.tar.gz" -o /tmp/node-review.tar.gz \
    && tar -xzf /tmp/node-review.tar.gz -C /tmp \
    && NODE_BIN="/tmp/node-v22.18.0-$PKG/bin"
  [ -x "$NODE_BIN/node" ] || { echo "Couldn't get Node. Ask Claude for help."; read -r; exit 1; }
fi
export PATH="$NODE_BIN:$PATH"
echo "Node: $(node -v)"

# 2. Install dependencies once if missing.
[ -d node_modules ] || { echo "Installing dependencies (first run only)…"; npm install --no-audit --no-fund; }

# 3. Open the portal once the server is up, then start Vite (passcode check is local in dev).
URL="http://localhost:5183/?client=montitrentini"
( for i in $(seq 1 60); do curl -s -o /dev/null "http://localhost:5183" && { open "$URL"; exit; }; sleep 0.5; done ) &
echo ""
echo "Opening: $URL"
echo "Passcode: monti"
echo "Review pages: Dashboard · Trade Portal (Presentations) · Catalog · Tools"
echo "────────────────────────────────────────────────────────────"
export VITE_AUTH_MODE=passcode VITE_PORTAL_PASSCODE=monti
if [ -f node_modules/vite/bin/vite.js ]; then
  node node_modules/vite/bin/vite.js --port 5183   # works even when npx isn't installed
else
  npx vite --port 5183
fi
