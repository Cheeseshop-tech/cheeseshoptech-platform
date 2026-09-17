# Cut & Wrap / 7 oz Pre-Cut — portion-reality rule + compliance audit

**Written:** 2026-09-17 · **Status:** ✅ RULE ESTABLISHED, AUDIT DONE, REMEDIATION #1 SHIPPED — the
7 non-compliant SKUs' images were unlinked from the Catalog the same day (see "Proposed fix" §1,
now done). Remediation #2 (real replacement photography for all 11 affected SKUs) is still open.

## The rule (Rick, 2026-09-17)

> All Cut & Wrap / Pre-Cut 7 oz items should **not** be images of whole wheels. They should be
> images of a piece cut out of a whole wheel, **wrapped and labeled** — the actual retail unit the
> buyer receives.

This sharpens the general portion-reality rule already in `CLAUDE.md` ("packshots must reflect
portion reality... a whole wheel shown with a cut wedge is acceptable **for the whole-wheel SKU**")
into an explicit, checkable rule for one specific category: **a whole-wheel photo is never
acceptable for a Cut & Wrap 7 oz SKU**, even with a cut wedge propped next to it — because that
wedge in the photo is *unwrapped and unlabeled*, which isn't what ships. The reference for
"compliant" is `monti/01101` (Sharp Provolone) — a single wrapped, labeled 7 oz wedge, no wheel in
frame.

**Scope:** the 19 real-SKU items `categoryForItem()` (`src/lib/catalog-categories.js`) classifies as
"Cut & Wrap" via `7 oz exact weight` / `weight === "7 oz"`. (The same category also includes 5.3 oz
Apericheese wedges — not audited here; same rule should apply when that's done as a follow-up.)

## Audit method

For each of the 19 SKUs, pulled the packshot(s) currently linked via the `code` context field in
`src/data/montitrentini/images.json` (the manifest `sync-images.mjs` builds from live Cloudinary),
downloaded the actual image, and looked at it directly — title/tag text alone isn't reliable (see
`01101`'s image, correctly titled "Sharp Provolone 7oz Wedge" and in fact compliant, vs. others
below whose images don't match their SKU's own name).

## Findings

**Compliant (8) — wrapped, labeled, no whole wheel in frame:**

| Code | Product | Cloudinary publicId |
|---|---|---|
| 01101 | Sharp Provolone | `monti/01101` |
| 20423 | Caciotta Black Truffles | `monti-trentini/usa-line/usa-product-20423-1cpb_t` |
| 20424 | Caciotta Chili Red Pepper | `monti-trentini/usa-line/usa-product-20424-1-_poa` |
| 20480 | Caciotta Mnt Herbs | `monti-trentini/usa-line/usa-product-20480-1qhijy` |
| 20481 | Caciotta Pepato | `monti-trentini/usa-line/usa-product-20481-1ufqgl` |
| 40163 | Ricotta Salata | `monti-trentini/other/ricotta-salata-1bcoay` |
| 02091 | Asiago Fresco PDO | `monti-trentini/asiago/asiago-pressato-dop-200g-atm-pf-02091-1i7ipq` |
| 04176 | Drunken Cheese (Imbriago) | `monti-trentini/stagionati/imbriago-fette-200g-sv-04176-1eoi6h` |

**Non-compliant (7) — violates the rule as it stands today:**

| Code | Product | Cloudinary publicId | What's actually in the photo |
|---|---|---|---|
| 01190 | Provolone Mild | `monti-trentini/other/product-no-01190-1j3yg0` | **Whole wheel** + an unwrapped wedge propped on top |
| 03044 | Asiago Aged PDO | `monti/03044` | **Whole wheel** + an unwrapped wedge in front |
| 04165 | Lagorai Cheese | `monti/04165` | **Whole wheel** + an unwrapped wedge in front |
| 04182 | Vezzena Cheese | `monti/04182` | **Whole wheel** + an unwrapped chunk in front |
| 04211 | Alpeggio Cheese | `monti/04211` | **Whole wheel only** — no cut piece at all |
| 05091 | Grana Padano | `monti-trentini/grana/grana-padano-porzionato-05091-1nsec5` | Not a whole wheel, but an oversized **unwrapped** wedge next to loose label art — not the 7 oz wrapped retail unit |
| 01174 | Naturally Smoked Provolone | `monti/01174` (primary) + `monti/01174-retail-pack` (alt) | Primary: raw **unwrapped, unlabeled cylinder logs**, not even cut into a wedge. Alt: round vacuum pucks — a different pack format, not the 7 oz wedge either |

**Missing entirely — no image linked to the code at all (4):**

| Code | Product |
|---|---|
| 40086 | Montasio PDO |
| 40184 | Pecorino Romano PDO |
| 03073 | Aged Asiago (Vecchio) 9 Months |
| 05600 | Parmigiano Reggiano DOP Aged 18 Months |

(A 20th line, item code `tbd` — "Aged Black Truffle 7 Oz EW" — has no real item number yet per
`catalog.json`, so it's out of scope until Inventory assigns one.)

**Net: 8 of 19 compliant. 11 of 19 (58%) either show the wrong thing or show nothing.**

## Proposed fix — not yet done, needs Rick's call

Two separate problems, two separate fixes:

1. **The 7 non-compliant SKUs currently read as "approved" when they shouldn't.** Per
   `CLAUDE.md`'s existing rule, a non-compliant photo can't just be swapped for a "close enough"
   hub image — it has to be reshot, unless the exact same cheese in the exact same portion already
   exists elsewhere in the hub in hi-res (checked: it doesn't, for any of these 7). Until reshot,
   the honest state is **not approved**, not "approved-for-press" showing the wrong product form to
   buyers. Recommended action: flip these 7 assets' approval tag from `approved-for-press` to
   `draft` via Media Hub's own write path (`media-update.js` — the authenticated, logged path; see
   `HANDOFF_2026-09-17_agent-cloudinary-writes-bypass-audit-log.md` for why not a direct Cloudinary
   call). That drops them out of `gatedCode()`'s approval gate, so the Buyer Catalog/Pricing/
   Proposals stop showing the wrong-portion photo for that SKU until a real replacement ships —
   same as having no photo, which is more honest than a wrong one.
   - **Caveat for whoever runs this:** `media-update.js`'s tag write is a full REPLACE, not a merge
     — it only preserves tags that are in its own `usage` whitelist (`product-catalog`, `hero`,
     etc.). Any tag outside that list (e.g. `bg-removed`) on these 7 assets would need to be read
     first and re-included, or it silently disappears. Check each asset's current tags before
     writing.
2. **11 SKUs (7 non-compliant + 4 missing) need real photography or replacement.** This is a
   shoot/reshoot request, same shape as `docs/MARKETING_IMAGE_REQUEST_2026-07-13.md`'s P1 list —
   several of these (04165, 40086, 03044, 01101, 01174) were already on that list in July; 01101 has
   since been fixed (compliant now), the rest haven't. Recommend folding this audit's 11 into a
   refreshed version of that request rather than starting a separate list.

**Update, later the same day:** #1 shipped. Rick approved the remediation and the new
`AGENT_GATE_PASSCODE` credential (`docs/` — see `_write-guard.js`) made a scriptable write
possible: all 8 assets (7 SKUs + both of 01174's photos) were unlinked via `media-update.js` (the
same soft action as Media Hub's "Delete image" button — sku cleared, `product-catalog` tag
dropped, files untouched in Cloudinary), then `sync-images.mjs --live` re-ran to rebuild the
manifest. Confirmed: manifest's code count went 78 → 70, matching the 8 assets touched. #2 (real
replacement photography for all 11 affected SKUs) is still open — see
`docs/MARKETING_IMAGE_REQUEST_2026-07-13.md` for the existing request-list convention to fold this
into.
