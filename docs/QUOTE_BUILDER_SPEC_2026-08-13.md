# Quote Builder — Build Spec & Prompt

Status: BUILT 2026-08-13 · Owner: Rick Posada · Shipped as the “Quotes” tab in Pricing & Inventory.
See docs/BUILD_LOG.md 2026-08-13 for what landed and what deliberately did not.
Reference sample: `FreshDirect_PricingAOneSheet.pdf` (Rick, 2026-08-13) — a branded, external,
one-sheet rate card sent to a prospective/negotiating buyer. This is the target visual and
information format; each of the three purposes below reuses that same visual system with a
different arrangement of the pricing table and header/footer copy.

This doc is written to be handed directly to a coding session as the build prompt. It assumes
familiarity with the existing repo conventions (`docs/QUOTING_TOOL_PRINCIPLES.md`, "one mind/one
body" data ownership, the Netlify Blobs history-store pattern).

---

## 1. What this is, and how it's different from what exists

Three surfaces already do adjacent things — this is a fourth, distinct one:

| Surface | Audience | Style | Status |
|---|---|---|---|
| **Pro Forma** (`pricing-tool.jsx`) | Internal | Dense working order — case qty grid, live inventory/lot allocation, freight | Live |
| **Proposal** (`proposal-builder.jsx` / `proposals.js`) | Buyer | Multi-page trade deck, shareable link, story blocks, themes | Live |
| **Quote Builder** (this spec) | Buyer (printed/emailed PDF) | **One-page branded rate card** — header + optional story panels + one pricing table + footer | **New** |

The Quote Builder is not a case-quantity order and not a multi-page deck. It's the FreshDirect
one-sheet: "here is our price list, arranged for this specific conversation," generated to
print/PDF and send. Delivery is print-only for v1 (no shareable link — that's the Proposal
engine's job; don't duplicate it).

## 2. The three purposes (one shared engine, three arrangements)

A purpose selector at the top of the new tab switches the table columns, header framing, and
footer copy. All three share the same visual system (see §5) and the same SKU-picking, pricing,
and quote-logging plumbing.

### 2a. New Customer Negotiation
Matches the FreshDirect sample almost exactly.
- Header: "Prepared for `[Customer]`" · date · "Quote valid until `[date]`"
- 2–3 story panels (grid, like the sample's "Everything at home / Why the mountains matter / A
  new taste for the future") — **on by default**, rep can toggle which blocks show. Pull from
  `brand-kit.json` `storyBlocks`, filtered by the audience implied by the selected class-of-trade
  tier (distributor → `distributor`, direct-retail → `retail`, etc.)
- Divider bar: "`[N]` Selections · `[audience label]` · FOB SEAFRIGO Merchandise Pricing"
- Table columns: **Item | Type (PDO/Mountain badge) | Format & Aging | SKU | $/lb (or $/cs) | Net
  Wt/Case**
- Footer: merchandise-pricing disclaimer (freight/handling separate, quoted at order time) +
  contact block + brand motto — same disclaimer language as the sample.

### 2b. Price Change Notification
- Header: "Price Update Notice" for `[Customer]` · **Effective date** (prominent — replaces "valid
  until") · optional free-text reason (e.g., "reflecting increased milk and freight costs")
- Story panels **off by default** (toggle available — most existing customers don't need the
  brand pitch again)
- Table columns: **Item | SKU | Previous $/lb | New $/lb | Change (Δ$ and Δ%) | Effective Date**
- "Previous $/lb" auto-fills from the new quotes log (§4) — most recent prior quoted price for
  that customer + SKU combination, from ANY purpose, before this notice's effective date. Editable
  by the rep; shows "no prior quote on file — enter manually" when nothing is found.
- Footer: contact block + "Questions about this update, contact `[rep]`" + motto.

### 2c. Promo Offer
- Header: "`[Promo headline]`" (free text, e.g. "Late-Summer Alpine Selection") · **Offer window**
  (start–end dates, replaces single valid-until)
- Story panels **off by default** (toggle available)
- Table columns: **Item | SKU | Regular $/lb | Promo $/lb | You Save (% or $) | Format**
- Promo price = tier price with an order-level **"Promo discount %"** field (reuses the existing
  `customPct` engine input — same mechanism as Pro Forma's Custom ±%), with an optional per-line
  override for a rep who needs to hand-tune one item.
- Footer: contact block + "Offer valid `[start]`–`[end]`, while supplies last" + motto.

## 3. Shared building blocks (reuse, don't rebuild)

- **Pricing math**: `pricing-core.js` — `quoteUnitPrice(sku, opts, config)`, `round2`. No changes
  needed; `opts.customPct` already gives Promo its discount lever.
- **SKU picking**: a curated multi-select (search → add to quote), not the always-on qty grid Pro
  Forma uses. Build on the same `flattenSkus`/`resolveSkus`/`skuDisplayName` helpers in
  `proposals.js` (name resolution already follows the items.js-wins-else-catalog.json join —
  don't re-derive it).
- **Customer field**: same pattern as Pro Forma's customer `<select>` + "+ New customer…" (sourced
  from `commitments.commitments[].customer` / `.alsoBuy`).
- **Story blocks**: `brand-kit.json` → `storyBlocks[]`, already audience-tagged. Render as
  checkboxes; selected keys drive which blocks print.
- **Class of trade / tier**: `config.pricing.tiers` (same selector as Pro Forma).
- **Validity/date requirement UX**: copy the "no default window, rep must set it, Print is
  disabled until set" pattern from Pro Forma's `validUntil` field — apply it to whichever date
  field is authoritative per purpose (valid-until / effective date / offer window).
- **Print/PDF mechanism**: copy `printProforma()`'s approach exactly — open a blank window, write
  a fully inline-styled HTML string, `window.print()` on load. Don't introduce a PDF library.

## 4. New: shared "quotes issued" log (closes a flagged gap)

`docs/QUOTING_TOOL_PRINCIPLES.md` §9 already lists "Quotes issued / approvals (logging) — not
captured yet — ⏳ future (extend the history store)." This build closes it, and Price Change's
"previous price" auto-fill depends on it.

Mirror the existing movement-history pattern exactly:

- **`src/lib/quotes-log.js`** — same shape as `src/lib/history.js`: `appendQuoteLog(tenantId,
  records)` (optimistic localStorage write + best-effort POST when `PRICING_BACKEND !== "mock"`)
  and `loadQuoteLog(tenantId)` (remote merged with local, deduped by id).
- **`netlify/functions/quotes.js`** — same shape as `netlify/functions/history.js`: Netlify Blobs
  store `"quotes"`, `GET ?tenant=` → `{ records }`, `POST { tenant, records }` → append+dedupe by
  id (cap batch/stored size the same way), guarded by `requireReadAuth`/`jsonUnauthorized` from
  `_write-guard.js`, self-logs via `_write-log.js` on write (standing rule: every write endpoint
  logs itself).
- **Record shape** (one row per SKU line on a printed quote, so it's queryable per customer+SKU
  like movement history is per SKU+period):
  ```
  {
    id, tenant, at,                 // ISO date generated
    purpose,                        // "new_customer" | "price_change" | "promo"
    quoteId,                        // groups every line of one printed quote together
    customer, skuCode, unitPrice, unit,   // "lb" | "case"
    tierId,
    validUntil, effectiveDate, promoStart, promoEnd,   // whichever applies to `purpose`
  }
  ```
- **Write trigger**: same as Pro Forma's `recordSale()` — an explicit action tied to "Generate /
  Print," not fired on every keystroke. Append happens right before (or as part of) opening the
  print window.
- **Read for auto-fill**: Price Change Notification, on SKU add, looks up the most recent record
  in the log for that `customer` + `skuCode` (any purpose) dated before the notice's effective
  date, and pre-fills "Previous $/lb" from it.

## 5. Visual system (must match the sample, not Pro Forma's plain print style)

Pull tokens from `brand-kit.json` (already loaded per-tenant) rather than hardcoding Monti's
colors, so this works for any future tenant:
- Background: `identity.colors.neutrals` → "Heritage Cream" (`#FFFBDC`)
- Headline / rule color: `identity.colors.primary` (`#064E22`)
- Accent bar / eyebrow labels: `identity.colors.accent` (`#009640`)
- Display font for headline: `identity.type.display.cssStack`
- Motto/heritage line in footer: `voice.motto`, `voice.heritage`
- Layout: header (brand name + tagline, right-aligned "Prepared for / date / valid-until" block),
  3-panel story grid (bordered cards), colored divider bar, bordered pricing table with a colored
  header row, footer disclaimer block, all within print-safe margins — same structure as the
  sample PDF.

This is a meaningfully different look from Pro Forma's current print CSS (plain white background,
dense working-doc styling) — don't reuse that stylesheet, build a new one scoped to this
component.

## 6. Structure / files

- **New**: `src/components/tools/quote-builder.jsx` — exports `QuoteBuilder({ data, brand,
  resolved, itemsDoc })`. Keep it out of `pricing-tool.jsx` (already 57KB) — that file only grows
  a new `<TabsTrigger value="quotes">Quotes</TabsTrigger>` / `<TabsContent>` wiring it in, after
  the Pro Forma tab.
- **New**: `src/lib/quotes-log.js` (§4)
- **New**: `netlify/functions/quotes.js` (§4)
- **Untouched**: `pricing-core.js`, `images.js`, `proposals.js`, `brand-kit.json`,
  `client.config.json` (except the contact-info addition below)

## 7. Data gap to close before/while building

`client.config.json` has no sales-contact block. The sample's footer ("Orders:
order@montitrentini-usa.com · Contact: Stefano Viero · (516) 507-9658 · Monti Trentini USA, LLC ·
Deerfield, IL") needs a canonical home — don't hardcode it into the component. Add e.g.:
```json
"brand": {
  ...
  "contact": {
    "ordersEmail": "order@montitrentini-usa.com",
    "name": "Stefano Viero",
    "phone": "(516) 507-9658",
    "company": "Monti Trentini USA, LLC",
    "city": "Deerfield, IL"
  }
}
```

## 8. Things I'm flagging for you, Rick (not blocking, but don't want you to lose them)

- **`pricing-tool.jsx` still has the hardcoded `TODAY = "2026-06-06"`** (flagged 2026-07-28, still
  unfixed) — the new Quotes tab should use a real `new Date()` for its own date stamps rather than
  importing that constant, so it doesn't inherit the staleness. Worth fixing the original
  Pro Forma constant in the same pass since you'll be in this file anyway.
- **Previous-price auto-fill only works going forward** — the quotes log starts empty at ship
  time, so the first Price Change Notification for any customer will show "no prior quote on
  file" until at least one New Customer or Promo quote has been logged for them.
- **No shareable link for v1** (per your call) — if a Promo Offer later needs to go out as a
  trackable link rather than an attached PDF, that's Proposal-engine territory, not this tab; flag
  it separately if you want that later.
- **SKU selection is manual for all three types** (per your call) — Shelf Life's "urgent <4mo"
  bucket isn't wired into Promo Offer's picker. Easy follow-on if you change your mind after using
  it once.

## 9. Suggested build order

1. `quotes-log.js` + `netlify/functions/quotes.js` (mirrors `history.js` — low risk, no UI)
2. `quote-builder.jsx` skeleton: purpose selector, customer/tier/date fields, SKU picker (no print
   yet)
3. Per-purpose table rendering (2a → 2b → 2c)
4. `printQuote()` HTML generator + brand-kit styling (§5)
5. Wire quote-log write on print, wire Price Change auto-fill read
6. Add `brand.contact` to `client.config.json`, wire into footer
7. Wire the new tab into `pricing-tool.jsx`
8. End with the usual double-clickable `COMMIT QUOTE BUILDER.command` in the repo root.
