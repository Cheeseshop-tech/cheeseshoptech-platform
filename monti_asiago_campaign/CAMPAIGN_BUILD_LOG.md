# Campaign Build Log — Monti Trentini · Asiago

Copied from `docs/CAMPAIGN_BUILD_LOG_TEMPLATE.md` (reusable per-client template — that file also
keeps a condensed version of this run as its worked example; this is the full, live copy for this
campaign specifically).

> Convention: log entries are `## YYYY-MM-DD — Title · what changed, why, what it unblocks.`
> Short and factual. Newest at top.

---

## 1. Campaign setup

| Field | Value |
|---|---|
| Client / tenant | Monti Trentini (tenant #1) |
| Campaign name | Asiago DOP launch (whole + vacuum-packed 1/4 wheels) |
| Channel(s) | Cheese shops & boutique groceries (national) — Stage-1 of the four-channel priority |
| Target list (CRM) | HubSpot active list **id 19**, "Asiago Touch 1 — Cheese shops" (Channel = Cheese shop/Boutique grocery AND Email known; 31 contacts, auto-grows). List id 17 ("National Cheese Shop") is NOT this list — it's the whole 699-contact DB, never send to it. |
| Stage-1 goal | Open dialogue with the decision-maker (owner/buyer) — NOT close an order |
| Pricing posture | By inquiry. No price/discount in the send at any touch until freight is set. |
| Brand kit | Monti Trentini brand kit (identity/imagery/voice/story blocks) |
| Asset library | `monti_asiago_campaign/` + `pdf_out/`; Cloudinary `monti-trentini/library/` |
| Send-from address | `sales@montitrentini-usa.com` (HubSpot Starter, G Suite, the only connected inbox) |
| Owners | Sales: Rick · Social: Eleonora (loop Maria Vittoria) · Producer/freight: Stefano |

## 2. The story

- **One-line story:** Product of the Mountains — authentic Italian Alpine Asiago DOP, milk within 90 km of Grigno, made/aged/packed in-house at 800m, Casa Finco *casari dal 1925*.
- **Pillars (3):** Alpine altitude milk · 100 years of craft (four generations, nothing outsourced) · sustainable operation (~650,000 kWh/yr solar, ~80% self-sufficiency, ~1,000 tons CO₂ avoided/yr).
- **Merchandising story / product ladder:** Fresco (30–40 days, mild/milky, gateway) → Stagionato (5 months, nutty/firmer, everyday) → Vecchio (9 months, deep/savory, connoisseur). Sell the ladder, not one SKU.

## 3. Deliverables checklist

- [x] **Campaign brief** (`README_Campaign_Brief.md`) — audience, products, formats, goal, pillars, cadence.
- [x] **CRM target list** — built + channel-tagged in HubSpot; dedup'd (list 19, 31 contacts, auto-grows).
- [x] **Sell sheet (designed)** — `Asiago_Sell_Sheet.html` → PDF via WeasyPrint, faithful render.
- [x] **Sell sheet (email-safe)** — `Asiago_Sell_Sheet_Email.html`, table layout + inline CSS + hosted Cloudinary images, ~600px, Georgia/Arial.
- [x] **Email sequence** — `Asiago_Cold_Email_Sequence.md`, 3-touch (Day 0 intro/find buyer → Day 4 story/proof → Day 9 nudge), HubSpot template id 283799276 "Monti Trentini — Buyer Intro" live.
- [x] **Social batch** — `Asiago_Social_Launch_Batch.md` (IG/FB/X/TikTok/blog + 2-wk calendar + image map), handed to Eleonora.
- [x] **Image map** — in the social batch doc; photo gaps listed (individual wheel shots, vac-pack 1/4 wheel, merchandised case, solar panels, Vecchio macro).
- [x] **PDFs** — `pdf_out/` has PDF+docx of every asset that gets emailed.
- [x] **Distribution plan** — native/manual (HubSpot Sales Starter has no Marketing Hub → can't publish social; social goes via scheduler or native, owned by Eleonora).
- [ ] **Pricing & freight** — by-inquiry holds; SEAFRIGO ask sent to Stefano, **answer still pending** (not launch-blocking).
- [ ] **Contact line** — email/cell in signature; OpenPhone Business number still pending (Rick to set up), not yet in sell sheet/signatures.
- [x] **Launch** — list ready, tracked Documents link (not attachment) used, 4-day follow-up task ticked per send, sample-tracking discipline explicit. **Batch 1 of 3 sent 2026-07-06 (10/31).**

## 4. Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-06-12/16 | PDF is the email/attachment format (no PPTX round-trip); email-safe HTML built as the in-body alternative | Designed HTML (flex/grid/web fonts) breaks when pasted into a mail body; PDF renders identically everywhere |
| 2026-06-16 | Business phone = OpenPhone Business (~$23/mo) | Native HubSpot call/text logging — serves "sample tracking is sacred" |
| 2026-07-02 | Sending address = `sales@montitrentini-usa.com`, routed via HubSpot Starter | Only connected inbox; plaintext + tracked-link strategy over heavy inline HTML for deliverability |
| 2026-07-03 | First campaign (Asiago) = outreach/introduction ONLY, no pricing in the send; launch NOT gated on Stefano's freight/pricing | Rick's call — proof of function first, pricing follows by inquiry |
| 2026-07-03 | List 17 abandoned; true audience = companies where `channel` = Cheese shop/Boutique grocery, built as active list id 19 | List 17 was discovered to be the whole 699-contact DB (distributors, chains, non-buyers), not a cheese-shop list |
| 2026-07-06 | Flag departed/deceased contacts (jobtitle note) instead of deleting, except confirmed-closed businesses which get deleted outright | Keeps CRM history for real former employees (Heather, pending: Anne Saxelby); outright delete only for a business that no longer exists (Luigi's Delicatessen) |

## 5. Reusable lessons (carry across clients)

- **Sell sheet → email:** designed HTML breaks in mail clients (stripped CSS/fonts). Ship the **PDF** attachment and/or a separate **email-safe HTML** (tables + inline CSS + hosted images). Test-send before trusting it.
- **HubSpot tiers:** social publishing needs **Marketing Hub Pro+**. Sales/Service Starter can't post — distribute native or via a scheduler. Verify seats early.
- **HubSpot active lists via API can lie.** List-id filtering through the connector returned the wrong data for list 19 (whole-DB mismatch) even though the list itself was correct in the UI. **Always cross-check a "send-ready" list count in the HubSpot UI before trusting an API read**, especially right before a launch.
- **1:1 manual sends need a live human in the loop, not full automation.** The safest pattern for Sales-Starter-tier campaigns: Claude coaches contact-by-contact (reads off the next name/email/flow), the human clicks send — catches stale contacts (Citarella), bounces (email typo), and dead accounts (Luigi's) in real time instead of after a batch blast.
- **Cold-chain cheese freight:** keep pricing **by inquiry** until the freight partner quotes; direct-to-retail (reefer LTL) and DTC (insulated parcel) are different lanes with different partners.
- **Pricing discipline:** no prices/discounts in outreach at Stage 1 — the ask is a taste + a talk.
- **Don't delete a contact just because someone left.** Flag with a jobtitle/note (e.g. "FORMER — no longer at X") so history survives; reserve outright deletion for confirmed-closed businesses.
- **PDF pipeline (no chromium):** markdown → `pandoc` → docx → `libreoffice --headless --convert-to pdf`; designed HTML → `weasyprint` (`pip install weasyprint --break-system-packages`).
- **Files are state, chat is scaffold.** Send/batch status must be written to the campaign's LAUNCH_DAY file (or equivalent) in the same session it happens — a separate chat updating only Claude's memory, not the files, is how a "GO" note survives hours past an actual launch.

## 6. Build log entries (newest at top)

### 2026-07-06 — Touch 1, batch 1 of 3 LAUNCHED (10/31 sent) + CRM cleanup
Rick sent all 10 manually in HubSpot (Buyer Intro template + tracked sell-sheet Documents link +
4-day follow-up task), Claude coaching contact-by-contact — no computer-use, Rick drove. Bounce
checkpoint held clean after #3. Mid-send: Citarella's Heather Celentano confirmed departed →
flagged FORMER, new contact Kristen Bausa created + associated, one bounce (email typo) caught
and corrected same session. Luigi's Delicatessen confirmed out of business (zero web footprint,
no email) — company + contact deleted outright in HubSpot (only non-flag deletion of the day).
Net: exactly 10 sent, CRM cleaner than at the start of the day. Unblocks: batches 2 (Tue 7/7) and
3 (Wed 7/8) of the remaining 20; Touch 2 queue (4-day To-do tasks) now building toward ~Fri 7/10.
Still open: Anne Saxelby retirement, C'est Cheese → Cheese Shop Santa Barbara rename, Stefano's
SEAFRIGO freight answer, OpenPhone number.

### 2026-07-04 — Test send passed, all launch gates cleared
Rick → Mary, template + sell-sheet link, delivered and rendered clean. Last open gate closed.
Scheduled task `asiago-touch1-launch-day` set to fire Monday 8:00 AM with the checklist.

### 2026-07-03 — Audience correction + enrichment + launch infrastructure live
Discovered list 17 was the whole DB, not a cheese-shop list. Rebuilt true audience from
`channel` = Cheese shop/Boutique grocery (241 companies): 24 send-ready with email out of the
gate, enriched +6 via web research (published-on-site emails only, no pattern-guessing) +
Benoit Breal write for Saxelby → 31 send-ready. Built active list id 19, template id 283799276
("Monti Trentini — Buyer Intro"), sell sheet in HubSpot Documents (tracked, gate off). Flagged
for later cleanup: Anne Saxelby (deceased, do not email), C'est Cheese (closed 2020, successor =
Cheese Shop Santa Barbara), "Luigi's Delicatessen" (no web footprint — later confirmed closed and
deleted 7/6). Also: DECIDED first campaign = intro-only, no pricing, not gated on Stefano.

### 2026-06-16 — Email-safe sell sheet + Stefano package + PDFs
Built `Asiago_Sell_Sheet_Email.html` (table/inline-CSS/hosted-image, 600px, Georgia+Arial, hero
text on a solid band). Restructured the Stefano note (to Stefano, cc Eleonora): purpose-led +
contents map + social hand-off section + SEAFRIGO freight ask + 5-way shipping comparison + US
cost map. Rendered all assets to `pdf_out/`. Phone placeholder removed pending OpenPhone.
Unblocks: a send-ready package + an in-body sell-sheet option.

### 2026-06-15/16 — Collateral + campaign content
Photo-forward sell sheet (HTML→PDF), 3-touch email sequence (pricing by inquiry), social launch
batch (IG/FB/X/TikTok/blog + 2-wk calendar + image map), campaign brief. 161 companies imported
to HubSpot, channel-tagged. Brand web-asset kit (29 files) → Cloudinary `monti-trentini/library/`.
