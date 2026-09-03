#!/bin/bash
# Double-click to commit + push: units correction — ERP monthly is POUNDS, 2024 = Jan–Jul (2026-07-15).
cd "$(dirname "$0")" || exit 1
export GIT_OPTIONAL_LOCKS=0

for f in .git/index.lock .git/HEAD.lock .git/refs/heads/*.lock; do
  [ -f "$f" ] && rm -f "$f" && echo "Cleared stale $f"
done

git add "scripts/build-sales-monthly.mjs" \
        "src/data/montitrentini/sales-monthly.json" \
        "src/lib/sales-monthly.js" \
        "docs/SALES_DATA_COVERAGE_2026-07-15.md" \
        "docs/CLIENT_DATA_REQUESTS_2026-07-15_sales-monthly.md" \
        "docs/BUILD_LOG.md" \
        "HANDOFF.md" \
        "COMMIT UNITS CORRECTION.command"

git commit -m "fix(forecast): ERP monthly seed corrected to POUNDS; 2024 = Jan-Jul by construction

Source PDFs (Rick-uploaded) settle two mislabels from the first parse:
- Reports are 'Statistica Di Riepilogo Mensilizzata — In Peso' (BY WEIGHT): values are lbs,
  not USD. Checksums tied the right numbers under the wrong label.
- All three PDFs elaborated 2024-07-30 ('Da GENNAIO A LUGLIO') — 2024 covers Jan-Jul only
  by construction; not missing data, a stale run date.

Changes:
- generator + seed rebuilt as schema 1.1-monthly-lb: soldLb; cases = lb / lbPerCase real
  pack spec (replaces price-inferred estimate; 173/251 records convert)
- coverage gate now in lbs: 2024 = 17,977 lb = 2.69% of broker 667,210 lb — gate stays shut
- month-column alignment flagged PROVISIONAL (PDF extraction scrambles columns; totals tie)
- data request updated: run the SAME ERP report FRESH through current closed month, all
  customers, In Peso + In Valore, xlsx/csv
- docs + BUILD_LOG correction entry + HANDOFF amended"

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
