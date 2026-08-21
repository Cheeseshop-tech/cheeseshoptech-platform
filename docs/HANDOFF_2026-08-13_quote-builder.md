# Handoff — Quote Builder (the one-page rate card)

Status: **v1 shipped and live.** Commits `2e603c1` → `61cc700` → `d2294a2` on `phase-2-6-build`.
Spec: `docs/QUOTE_BUILDER_SPEC_2026-08-13.md` · Log: `docs/BUILD_LOG.md` 2026-08-13.
Next thread: **continue building the form's function and its static appearance.**

---

## 1. Where the code lives

| File | Role |
|---|---|
| `src/components/tools/quote-builder.jsx` | The whole tab: form controls, SKU picker, on-screen sheet preview, and `buildQuoteHtml()` (the printed document). |
| `src/lib/quotes-log.js` | Client seam for the quotes-issued log + `lastQuotedPrice()` (the previous-price lookup). |
| `netlify/functions/quotes.js` | Shared Blobs store `quotes`, mirrors `history.js`. |
| `src/lib/images.js` | `brandAssetUrl()` / `brandAsset()` — the Media Hub resolver (see §4). |
| `src/data/montitrentini/client.config.json` | `brand.contact` — the printed footer contact block. |
| `src/components/tools/pricing-tool.jsx` | Only the `Quotes` tab wiring. Keep it that way; that file is already ~57KB. |

The printed sheet is one inline-styled HTML string written into a blank window (`printQuote()`),
copied from `printProforma()`'s approach. **No PDF library** — deliberate, don't add one.

## 2. What v1 does

- **Three arrangements off one purpose selector** — New Customer Negotiation · Price Change
  Notification · Promo Offer. The selector swaps table columns, header framing and footer copy;
  SKU picking, pricing and logging are shared.
- **Price list open on arrival** — all 106 SKUs scrollable on open, priced at the current method.
  Search narrows (same element as Pro Forma's). Click adds, click again removes.
- **Two pricing dropdowns** — class of trade, plus how the uplift is expressed: the tier preset,
  a manual **markup %** (`cost × (1+p)`), or a manual **gross margin %** (`cost ÷ (1−p)`).
  A manual figure *replaces* the tier preset; the tier still sets the printed audience line.
- **Quotes-issued log** — one record per SKU line on print, grouped by `quoteId`, carrying
  `priceMode` + `pricePct`. Feeds Price Change's "Previous" column.
- **Print gated** on: at least one SKU, no unpriced lines, the purpose's date(s) set, a valid
  percentage, and (promo only) a headline.

## 3. Static appearance — the palette is measured, don't re-guess it

Every surface colour was sampled from `FreshDirect_PricingAOneSheet.pdf` rendered at 150 dpi, and
matches to **≤1/255 per channel**. If you change the look, re-sample rather than eyeball.

| Element | Value | Source |
|---|---|---|
| Page background | `#FFFBDC` | kit neutral · Heritage Cream |
| Story panels, alternate table rows | `#FAF9F5` | kit neutral · Casa Paper |
| Headline, bars, item names | `#064E22` | kit primary · Forest Green |
| Eyebrow, dates, savings | `#009640` | kit accent · Italia Green |
| Body copy | `#141413` | kit neutral · Mountain Ink |
| Divider-bar text, PDO badge fill | `#C8E2C5` | kit secondary · **Alpine Mint** |
| Table header text | `#FFFFFF` | reference |
| Hairline rules, table border | `#E3DEC7` | **not a kit token** — literal |
| Non-PDO badge fill / text | `#EFE8D1` / `#796A2E` | **not kit tokens** — literal |
| Footer small print | `#BBB6A6` | reference |

Traps already hit once, so don't repeat them:
- Row banding is **cream ↔ Casa Paper**, not a tinted primary. A green tint reads as a colour wash.
- PDO gets the mint pill; everything else gets the **khaki** pill — that contrast is what says
  "not a protected designation."
- The two non-token colours are labelled as literals in the component on purpose. Don't "tidy"
  them into the green palette.

**Type:** display = `identity.type.display.cssStack` (Cora → Fraunces fallback), UI =
`identity.type.ui.cssStack` (Futura PT → Inter). The print window loads Google Fonts for the
fallbacks; Typekit is not available there.

## 4. Image rule — Media Hub is the front door

**Never hand-type a Cloudinary `public_id`.** Resolve through `brandAssetUrl(resolved, ref, preset)`,
which treats a brand-kit reference as a hint and matches it against the Media Hub manifest
(`src/data/<tenant>/images.json`). Returns `""` when the asset genuinely isn't there — that is
deliberate; don't "fix" it with a blind URL.

- Real cloud is **`sofcvmwa`**; top folder is **`monti-trentini/`** (NOT `monti/`).
- Locally `VITE_CLOUDINARY_CLOUD` is unset, so `cldUrl` falls back to Cloudinary's `demo` cloud.
  **A 404 in dev doesn't prove an id is wrong, and a working dev URL doesn't prove it's right.**
  Verify against `sofcvmwa` (curl, or the Cloudinary MCP — it's connected to the right account).
- Logos carry alpha: never deliver them through a `b_white` padded preset (`micro`/`thumb`/`card`).
  Use `preview`/`hero`, or `transparent: true`.
- Still missing from the account entirely: **`wordmark`, `favicon`, `seal`**. They render nothing
  until someone uploads them. The two Casa Finco SVGs in the library are heritage marks, *not* the
  Monti wordmark — don't map them across.

## 5. Known-open — the next thread

### Function
1. **Quote approvals** — the last §9 gap. Accepted/declined per `quoteId`, same store, one more
   record type. Turns the log from "what we sent" into "what closed."
2. **Reorder / group the selections** — lines print in the order added. The reference sheet groups
   by category. No drag-reorder and no grouping yet.
3. **Per-line notes / a free-text row** — no way to annotate a line ("new pack size from Sept").
4. **Save & reopen a quote** — every sheet is built from scratch; there's no draft. Pro Forma has
   the same gap. `localStorage` draft like `proposals.js` `loadDraft/saveDraft` is the cheap version.
5. **Volume breaks are not exposed** here (Pro Forma has them). Deliberate for v1 — a rate card
   isn't an order — but revisit if reps want a tiered price column.
6. **Shelf-life integration** — Promo's picker still doesn't surface the "urgent < 4 months"
   bucket. Rick's call for v1; easy follow-on now the picker shows the full list.
7. **Multi-currency / EUR** — USD only. The storefront side is EUR (see the two-codebases note).

### Static appearance — **measured**, not estimated

I rendered a 40-SKU New Customer sheet at true Letter width (816px) and measured it against one
printed page (Letter @96dpi = 1056px, less the 0.4in `@page` margins = **979px of content**).

```
40 SKUs  ->  2046px  =  2.09 pages
chrome above the table          482px
thead                            29px
footer + contact block           94px
                              -------
left for rows on page 1         374px  ->  ~11 rows      (the reference sheet fits 18)
```

8. **Only ~11 rows fit page 1, against the reference's 18.** Two separate causes, and the second
   one surprised me:
   - **Story panels are 200px tall vs the reference's 132px — 68px over, ≈ 2 rows.** Not a layout
     bug: the reference's panel copy was *edited down* to ~35–40 words, while we print the full
     brand-kit `storyBlocks[].body` at 61–70 words. Either the kit needs a short-form field for
     print, or the panel needs a line cap. Do **not** silently truncate brand copy to fix this.
   - **Row height matches the reference exactly (32px) for normal rows** — but 14 of 40 rows blow
     out to 43–47px because `Format & Aging` wraps to a second line on long `packing` strings
     (e.g. `#04211` "7 oz Exact Weight Wedges, vacuum packed · aged…"). Narrowing that column or
     shortening the composed string recovers ~12px per affected row.
9. **No page-break control at all** — there is not one `page-break-*` / `break-inside` rule in the
   printed CSS, so a row can be sliced in half by the page boundary. `thead` *is*
   `display: table-header-group`, so browsers should repeat the header on page 2 — but the table
   carries `overflow: hidden` (there for the border-radius), which establishes a new formatting
   context and can suppress that in some print engines. **Verify in a real print preview before
   assuming either way.** There is also no "page 1 of N".
10. **Story panels are hard-coded to 3 columns.** Selecting one or two still renders a 3-column
    grid, so they stretch. The column count should follow the selection.
11. **No packshots on the sheet.** The reference has none either, but it's the obvious next
    variant — and the picker already resolves images, so the wiring exists.
12. **Logo is fixed at 62px tall.** Fine for the oval mark; a wordmark-shaped asset would need
    different handling.

## 6. Gotchas that will bite

- **`npm run dev` does not serve Netlify Functions.** The quotes log silently falls back to
  `localStorage` only. Authed functions can only be exercised on the deploy.
- **The 2026-08-17 Identity migration (`32a9da6`) moved `quotes.js` and `quotes-log.js` onto the
  real Netlify Identity guard.** Anything in older notes about `x-portal-passcode` is stale;
  the client seam now uses `authHeaders()` from `auth-context.jsx`.
- **Catalog copy carries spreadsheet artifacts** — embedded newlines and literal `—` placeholders
  in `packing` / `marketing.age`. `tidy()` + `blankish()` in the component strip them at render
  time only; nothing is written back. The underlying records are still messy.
- **The quotes log accrues forward only.** "No prior quote on file" is correct, not broken.
- **Two SKUs are priced per case** (`unit: "case"`, e.g. `#04211` at `$53.97/cs`). Every price path
  must handle both; the column header switches to `PRICE` when a sheet mixes units.

## 7. First thing to do next session

**Pagination (items 8–9) is the gating issue; everything else on the list is additive.** A rep
quoting a realistic 18-SKU range — the size of the reference sheet itself — already spills onto a
second page that has no break rules and possibly no repeated header.

Order I'd take it in:
1. Open a real print preview of a 20-SKU sheet and settle the `thead`-repeat question (§5 item 9).
   That single observation decides whether this is a CSS afternoon or a layout rethink.
2. Add `break-inside: avoid` on rows and a repeated header; decide on "page 1 of N".
3. Recover the 68px of panel height — most likely a `storyBlocks[].shortBody` in the brand kit
   rather than a truncation in the component.
4. Then the function list (§5) in Rick's priority order.
