#!/bin/bash
# COMMIT SIGN IN PAGE — the apex (cheeseshoptech.com) becomes the sign-in page:
# "CheeseShop TECH · Cheese Merchant Business Tools". Double-click to commit and push.
#
# ⚠️ THIS CHANGES WHAT THE PUBLIC SEES AT cheeseshoptech.com.
#    Before: a coming-soon marketing page with a quiet "Sign in" link.
#    After:  the sign-in page itself. ComingSoon and LandingPage stay on disk to swap back.

cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

echo "=============================================="
echo " COMMIT: apex sign-in page"
echo " Cheese Merchant Business Tools"
echo "=============================================="
echo
echo " NOTE: this replaces the public coming-soon page"
echo " at cheeseshoptech.com with the sign-in page."
echo
read -n 1 -s -r -p "Press any key to continue, or Ctrl-C to cancel..."
echo
echo

# Clear stale sandbox lock files first (known FUSE trap — see memory: sandbox git lock trap)
for lock in .git/index.lock .git/HEAD.lock .git/packed-refs.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock" && echo "Cleared stale $lock"
  fi
done
echo

echo "Staging changed files..."
git add \
  "src/components/marketing/sign-in-page.jsx" \
  "src/components/auth/login-screen.jsx" \
  "src/App.jsx" \
  "docs/BUILD_LOG.md" \
  "docs/HANDOFF_2026-08-21_sign-in-page.md" \
  "COMMIT SIGN IN PAGE.command"
if [ $? -ne 0 ]; then
  echo
  echo "❌ git add FAILED — nothing committed. Fix the error above and re-run."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Staged."
echo

echo "Committing..."
git commit -m "The apex is the sign-in page: Cheese Merchant Business Tools

cheeseshoptech.com served a coming-soon marketing page with a quiet Sign in
link. It is now the sign-in page itself — one simple door, no marketing detail.
ComingSoon and the invite-only LandingPage both stay on disk for a future
marketing launch, and App.jsx documents how to swap either back.

Named 'Business Tools' rather than 'Marketing Tools': behind that login sit
pricing, quoting, inventory, orders, CRM and catalog alongside the content and
campaign tools, so marketing describes about a third of it.

One login, not two. The form was extracted from auth/login-screen.jsx as
LoginForm and the new page renders that same live Identity component inside its
own layout. LoginScreen still renders it in exactly the markup it always did, so
the authenticated route is untouched. On success the page hands off to ?app=1,
the staff entry the router already understands.

Imagery: two Media Hub assets (alpine pasture panel, aged wedge inset) with a
Terracotta-to-ink scrim so the agency front door stays on the house palette
rather than borrowing a client's green. The wedge uses the preview preset, not
card — card is c_pad,b_white and letterboxed it in a white box. The pasture
carries a 6% scale to crop two carousel dots baked into the source asset's
bottom edge; the real fix is a clean re-crop in the Media Hub.

The two ids are pinned in one named const rather than resolved via
brandAssetUrl(), because that resolver reads a tenant manifest and the apex is
house. Verified live against the sofcvmwa cloud; they should move to a house
manifest when one exists. Local dev falls back to Cloudinary's demo cloud, so
the panel looks empty on npm run dev unless VITE_CLOUDINARY_CLOUD is set."
if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED (or nothing to commit) — see the message above."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "✅ Commit created."
echo

echo "Pushing to remote..."
git push
if [ $? -ne 0 ]; then
  echo
  echo "❌ PUSH FAILED — the commit exists locally but did NOT reach GitHub."
  echo "   (A 'fatal error in commit_refs' is a transient GitHub fault — just re-run this file.)"
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo
echo "✅ Pushed. Netlify will rebuild — cheeseshoptech.com becomes the sign-in page."
echo
read -n 1 -s -r -p "Press any key to close..."
