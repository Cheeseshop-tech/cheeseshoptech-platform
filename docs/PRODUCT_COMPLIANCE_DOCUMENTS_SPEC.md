# Product Compliance Documents — Spec

**Written:** 2026-08-15 · **Status:** 📝 SPEC ONLY — not built, no code changes.
**Origin (Rick, 2026-08-15):** spec sheets and nutritional info are needed to onboard new
distributors and supermarket chains. "Text heavy with a small image… more of a form or a
presentation or a file." Named **Product Compliance Documents**.

## Scope

Everything a buyer's category or compliance team asks for before a first order: product
specification sheets, nutritional panels, allergen and ingredient statements, certifications,
UPC/EAN. Not marketing collateral — sell sheets and line cards are outputs (see Layer 3), and
pricing stays with the Custom Price List Creator.

## The three layers

The reason this felt slippery is that one artifact is genuinely three things. They are stored,
owned, and updated differently, so the spec separates them.

| Layer | What it is | Owner | Editable by CST |
|---|---|---|---|
| **1. Compliance data** | Nutrition values, allergens, ingredients, UPC/EAN, net weight, shelf life, origin, storage temp | Item record | Yes, with provenance |
| **2. Producer documents** | Monti's official spec sheet PDFs, market- and revision-controlled | Cloudinary (raw) | **No — distribute only** |
| **3. Generated documents** | Sell sheets, line cards, onboarding packets | Rendered on demand | Yes, generated |

**Layer 1 is data, not a file.** Locked inside a PDF, every retailer's own new-item form means
re-keying it by hand. That re-keying is the recurring cost onboarding actually imposes.

**Layer 2 cannot be regenerated.** Those PDFs are authored under Monti's document control. CST
stores, versions, and distributes them; it never edits or recreates them.

**Layer 3 is a view**, the same way the Catalog is a view over the image manifest
(`IMAGE_PIPELINE_SPEC.md`). Assembled from Layer 1 + a packshot from the Media Hub.

## Document metadata — adopt the producer's schema

Monti's filenames already encode the model. Do not invent one:

```
02091.EU_rev2_[EN] 02.05.2025.pdf
03023.USA_rev0_[EN].pdf
03044.EU_rev3_[EN] 2025-07-11.pdf
20481.USA_rev0_[EN]2025-10-31.pdf
```

→ **item code · market · revision · language · issue date**

```json
{ "code": "02091", "market": "EU", "revision": 2, "language": "EN",
  "issuedAt": "2025-05-02", "docType": "spec-sheet",
  "publicId": "monti-trentini/compliance/02091.EU_rev2_EN",
  "resourceType": "raw", "format": "pdf", "current": true }
```

Two requirements fall out of this that were not in the original ask:

- **Market variants.** A document is valid for a market. Sending a chain the EU sheet when a USA
  revision exists is a compliance failure, not untidiness.
- **Revision control.** Only one revision per (code, market, docType) is `current`. Superseded
  revisions are retained, never deleted — a buyer may hold an older rev and ask about it.

**Coverage is uneven today.** `03044` is at EU rev3 while `03023` has only USA rev0. Nothing can
currently report which SKUs lack a current US spec sheet. That gap report is part of this build —
model it on `IMAGE_HEALTH_2026-07-09.md`.

## Storage

Parallel to the item copy document, same seam, same guard:

- **Documents:** Cloudinary `resource_type: raw`, folder `${tenantFolder}/compliance/`.
- **Index:** one raw JSON per tenant at `${tenantFolder}/compliance/documents.json`, written by a
  `documents-save` function and read by `documents-get`, mirroring `items-save` / `items-get`
  (`src/lib/items.js`). Mock mode persists to localStorage behind the same seam.
- **Write gate:** `admin` / `client-admin`, enforced server-side by `netlify/functions/_write-guard.js`,
  identical to item editing.

Documents join to a SKU by `code`. They must **not** route through `gatedCode()` in
`scripts/sync-images.mjs` — that gate is image dispatch (it requires the `product-catalog` tag to
stop a lifestyle photo being served as a packshot) and has no meaning for a PDF.

## Item record additions (Layer 1)

`emptyItem()` in `src/lib/items.js` gains compliance fields. Additive only — existing item
documents lack them, and readers must treat a missing field as empty rather than defaulting it, so
"not yet entered" stays distinguishable from "confirmed zero":

| Field | Notes |
|---|---|
| `ean` | Today only `upc` exists; EU trade needs EAN |
| `ingredients` | Statement, verbatim from the source document |
| `allergens` | Structured list |
| `nutrition` | Per-100 g panel: energy, fat, saturates, carbs, sugars, protein, salt |
| `shelfLifeDays` | Total shelf life from production |
| `storageTemp` | e.g. `"+4 °C … +8 °C"` |
| `countryOfOrigin` | |
| `provenance` | **Required whenever the above are set** — `{ sourcePublicId, revision, market, enteredBy, enteredAt }` |

Field order continues to mirror the price & inventory sheet, per the existing convention in
`items.js`. Pricing stays out, as it does today.

## Hard rule — nutrition and allergen provenance

**Nutrition, allergen, and ingredient values are never AI-composed, inferred, translated, or
copied from a competitor listing.** They are transcribed from a specific producer document
revision, and the record carries `provenance` pointing at it. A wrong allergen is a recall and a
legal exposure, not a content bug.

Treat this field class exactly as pricing is treated: excluded from every generative surface
(Content Engine, Studio Director, campaign copy). Add it explicitly to the
`cheese-shop-tech-ai-compliance` rules.

When a producer document is superseded, any item record whose `provenance.revision` points at the
old revision is flagged stale — it does not silently keep serving the previous values.

## The onboarding packet (Layer 3)

The actual deliverable when onboarding a distributor or chain. Pick a customer and a set of SKUs →
produce one link or archive containing, for that customer's market: current-revision spec sheets,
nutrition panels, packshots, and a line card. Same assembly pattern as Proposals and Presentations,
which already exist.

This is what makes the tab worth building. Storing PDFs is filing; assembling the correct packet
for a specific buyer is the job.

## Acceptance criteria

- [ ] A document uploaded for a code appears against that SKU with market, revision, language, and
      issue date parsed from the producer's filename.
- [ ] Exactly one revision per (code, market, docType) is `current`; superseded revisions are
      retained and retrievable.
- [ ] A coverage report lists SKUs with no current spec sheet for a given market.
- [ ] Nutrition/allergen fields cannot be saved without `provenance`.
- [ ] No generative surface can read the nutrition/allergen/ingredient field class.
- [ ] An onboarding packet for a named customer contains only that customer's market's current
      revisions.
- [ ] Superseding a document flags every item record still citing the old revision.

## Open questions

- **(Rick)** Do beauty/styled shots need to attach to a SKU? If so, `gatedCode()`'s
  `product-catalog` tag requirement has to widen or learn about photo `type` — carried over from
  `IMAGE_PIPELINE_SPEC.md` § Migration plan, because both hinge on the same gate.
- **(Rick)** Are non-EN language variants in scope for the first pass? The filename schema carries
  `[EN]`, so the model supports it; the question is whether Monti issues others today.
- **(Rick)** Who transcribes Layer 1 — CST or Monti's quality team? This decides whether
  `provenance.enteredBy` is a CST user or a client role (`docs/CLIENT_DATA_ROLES.md` would gain a
  Quality/Compliance function alongside Marketing, Sales Management, Inventory, Traffic).
- **(Rick/Claude)** Does the packet ship as a share link (like Proposals) or a downloadable
  archive? Chains often want a file to attach to their own system.
