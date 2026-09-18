#!/bin/bash
set -e
cd "$(dirname "$0")"

[ -f .git/index.lock ] && rm -f .git/index.lock

git add src/lib/catalog-categories.js src/components/catalog/buyer-catalog.jsx "COMMIT PRODUCT CATALOG CATEGORY TABS.command"

git commit -F .commit-msg-product-catalog.txt

if git push; then
  echo "Pushed successfully."
else
  echo "Push failed -- see error above."
fi

rm -f .commit-msg-product-catalog.txt

read -n 1 -s -r -p "Press any key to close..."
echo
