#!/bin/bash
cd "$(dirname "$0")" || exit 1
git add src/data/montitrentini/catalog.json \
        src/data/montitrentini/items-seed.json \
        src/data/montitrentini/signs.json \
        src/data/montitrentini/source/cut-and-wrap-spec.json \
        src/data/montitrentini/source/aging-2026-08-28.json \
        docs/AGING_UPDATE_2026-08-28.md
git commit -m "Apply Stefano's official aging sheet across the app

Source: ageing item list.xls (Stefano, 2026-08-28), captured as
src/data/montitrentini/source/aging-2026-08-28.json - now the canonical
aging record. Column C (min age at shipment) is authoritative; column D
(30 days/1 month warehousing) is a logistics allowance and is NOT copy.

- items-seed.json: minAge on 80 SKUs
- catalog.json: marketing.age on 33 of 38 products (was 12) + blurb leads
- signs.json: Caciotta 5 days -> 30 days (x4), Imbriago 30 days -> 5 months,
  plus the sign prose that asserted a contradicting age
- cut-and-wrap-spec.json: minAge on 14 C/W wedges

Material: Grana Padano base 12-16 -> min. 10 months; Asiago Vecchio
wheels 9 -> 10 months; 21 products gained an aging figure.

Open questions for Stefano logged in docs/AGING_UPDATE_2026-08-28.md."
git log --oneline -1
echo "--- push ---"
git push origin "$(git rev-parse --abbrev-ref HEAD)"
git rev-parse HEAD
git rev-parse "origin/$(git rev-parse --abbrev-ref HEAD)"
