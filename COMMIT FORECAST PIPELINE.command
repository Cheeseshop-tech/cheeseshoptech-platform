#!/bin/bash
# Double-click to commit + push: monthly forecast pipeline, built + gated (2026-07-15).
# NOTE: run "COMMIT SWEEP UNTRACKED DOCS.command" FIRST if you haven't — it carries CLAUDE.md etc.
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

for f in .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock; do
  [ -f "$f" ] && rm -f "$f" && echo "Cleared stale $f"
done

git add "scripts/build-sales-monthly.mjs" \
        "src/data/montitrentini/sales-monthly.json" \
        "src/lib/sales-monthly.js" \
        "src/components/tools/pricing-tool.jsx" \
        "docs/SALES_DATA_COVERAGE_2026-07-15.md" \
        "docs/CLIENT_DATA_REQUESTS_2026-07-15_sales-monthly.md" \
        "docs/BUILD_LOG.md" \
        "HANDOFF.md" \
        "COMMIT FORECAST PIPELINE.command"

git commit -m "feat(forecast): monthly sales pipeline built + quality-gated; ERP slice flagged

- ERP monthly 2021-2024 exposed as <1% slice (2024: \$17,977 / 7 customers = 0.36% of broker
  \$4.99M, dead after June) — flagged, never fed to forecasting
- scripts/build-sales-monthly.mjs: any monthly source -> canonical seed; coverage measured
  against broker USD; forecastReady computed (2024 >= 80%), never hand-set
- src/data/montitrentini/sales-monthly.json: 251 records 2021-2024, USD + estimated cases
  (implied \$/case), per-record provenance, forecastReady:false
- src/lib/sales-monthly.js: seam to forecast-core — seed gated, live captures always flow,
  seedStatus() surfaces the hold in the Movement tab
- pricing-tool.jsx: Movement merges seed + ledger; run-rate/YoY go live when gate opens
- docs: coverage finding + copy-paste data request to Sales Management (full sales-by-item
  monthly, Jan 2024->current, cases+lbs+USD, xlsx/csv) with acceptance checklist + drop-in steps"

if [ $? -ne 0 ]; then
  echo
  echo "❌ COMMIT FAILED — check for a stale .git/*.lock file (see HANDOFF git-lock incident)."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi

echo
echo "Pushing (triggers Netlify deploy)…"
git push
status=$?
echo
if [ $status -eq 0 ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/phase-2-6-build)" ]; then
  echo "✅ Committed AND pushed — HEAD matches origin/phase-2-6-build."
else
  echo "❌ Push failed or HEAD != origin. Run: git push"
fi
read -n 1 -s -r -p "Press any key to close…"
