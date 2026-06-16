# Campaign Build Log — TEMPLATE (reusable per client)

A repeatable playbook + log for building and launching a CheeseShop TECH client campaign. **Copy
this file** to a new client's campaign folder (e.g. `<client>_<campaign>/CAMPAIGN_BUILD_LOG.md`),
fill the placeholders, and keep the log entries newest-at-top. The **Monti Trentini — Asiago** run
is included at the bottom as a worked example.

> Convention (matches `docs/BUILD_LOG.md`): log entries are `## YYYY-MM-DD — Title · what changed,
> why, what it unblocks.` Short and factual.

---

## 1. Campaign setup (fill first)

| Field | Value |
|---|---|
| Client / tenant | `<client>` |
| Campaign name | `<campaign>` |
| Channel(s) | `<distributors / cheese shops / grocers / chains>` |
| Target list (CRM) | `<HubSpot list name + id>` |
| Stage-1 goal | `<open dialogue / book demo / take order>` — usually relationship first |
| Pricing posture | `<by inquiry / list / promo>` |
| Brand kit | `src/data/<tenant>/brand-kit.json` (voice, colors, story blocks, story topics) |
| Asset library | Media Hub folder `<tenant>/...` (tagged public_ids) |
| Send-from address | `<sales@...>` |
| Owners | Sales: `<name>` · Social: `<name>` · Producer/pricing: `<name>` |

## 2. The story (one mind, one body — pull from the brand kit)

- **One-line story:** `<positioning hook>`
- **Pillars (3):** `<pillar 1>` · `<pillar 2>` · `<pillar 3>`
- **Merchandising story / product ladder:** `<the range, told as one story>`

## 3. Deliverables checklist

- [ ] **Campaign brief** (`README_Campaign_Brief.md`) — audience, products, formats, goal, pillars, cadence.
- [ ] **CRM target list** — built + channel-tagged in HubSpot; dedup'd.
- [ ] **Sell sheet (designed)** — on-brand HTML → PDF (faithful render via WeasyPrint).
- [ ] **Sell sheet (email-safe)** — table layout + inline CSS + hosted images + web-safe fonts, ~600px.
- [ ] **Email sequence** — 3-touch (intro/find buyer → story/proof → nudge), tokens, cadence, reply rules.
- [ ] **Social batch** — per platform (IG/FB/X/TikTok/blog) + calendar + image map; handoff owner named.
- [ ] **Image map** — Media Hub public_ids per asset; photo gaps listed to source/shoot.
- [ ] **PDFs** — `pdf_out/` versions of everything that gets emailed.
- [ ] **Distribution plan** — scheduler vs native; confirm CRM can/can't publish (Marketing Hub check).
- [ ] **Pricing & freight** — by-inquiry until the freight/landed answer; supplier ask sent.
- [ ] **Contact line** — phone/email/handle finalized in sell sheet + all signatures.
- [ ] **Launch** — list ready, attachments as PDF, tracking discipline set ("sample tracking is sacred").

## 4. Decisions log (capture the non-obvious calls)

| Date | Decision | Why |
|---|---|---|
| `<date>` | `<e.g. PDF is the email format>` | `<rationale>` |

## 5. Reusable lessons (carry across clients)

- **Sell sheet → email:** designed HTML breaks in mail clients (stripped CSS/fonts). Ship the **PDF**
  attachment and/or build a separate **email-safe HTML** (tables + inline CSS + hosted images). Test-send
  before trusting it (Gmail/Outlook/Apple Mail differ; WeasyPrint preview ≠ a mail client).
- **HubSpot tiers:** social publishing needs **Marketing Hub Pro+**. Sales/Service Starter can't post —
  distribute native or via a scheduler. Verify the account's seats early.
- **Cold-chain cheese freight:** keep pricing **by inquiry** until the freight partner quotes; direct-to-
  retail (reefer LTL) and DTC (insulated parcel) are different lanes with different partners.
- **Pricing discipline:** no prices/discounts in outreach at Stage 1 — the ask is a taste + a talk.
- **PDF pipeline (no chromium):** markdown → `pandoc` → docx → `libreoffice --headless --convert-to pdf`;
  designed HTML → `weasyprint` (handles CSS + remote images; `pip install weasyprint --break-system-packages`).

## 6. Build log entries (newest at top)

## `<YYYY-MM-DD>` — `<title>`
`<what changed · why · what it unblocks>`

---

# Worked example — Monti Trentini · Asiago launch (2026-06)

**Setup:** Client = Monti Trentini (tenant #1). Channel = national Cheese Shops & Boutique Grocers.
List = HubSpot "National Cheese Shop Campaign" (active list id 17, ~150–161 cos). Stage-1 = open
dialogue with the decision-maker. Pricing = by inquiry. Send-from = Sales@montitrentini-usa.com.
Owners: Sales = Rick; Social = Eleonora (loop Maria Vittoria); Producer/freight = Stefano.

**Story:** *Product of the Mountains* — authentic Italian Alpine Asiago, milk within 90 km of Grigno,
made/aged/packed in-house at 800 m, Casa Finco *casari dal 1925*. Pillars: Alpine altitude milk · 100
years of craft · sustainable operation. Ladder: Fresco → Stagionato → Vecchio, whole + 1/4 wheels.

**Decisions:** PDF = the email/attachment format (no PPTX round-trip). Business phone = OpenPhone
Business (HubSpot call/text logging). Distribution = native/scheduler (no Marketing Hub). Email-safe
HTML sell sheet built as the in-body option.

### 2026-06-16 — Email-safe sell sheet + Stefano package + PDFs
Built `Asiago_Sell_Sheet_Email.html` (table/inline-CSS/hosted-image, 600px, Georgia+Arial, hero text on
a solid band). Restructured the Stefano note (to Stefano, cc Eleonora): purpose-led + contents map +
social hand-off section + SEAFRIGO freight ask + 5-way comparison/US cost map. Rendered all assets to
`pdf_out/` (pandoc→libreoffice for md; weasyprint for the sell sheet). Phone placeholder removed pending
OpenPhone. Unblocks: a send-ready package + an in-body sell-sheet option.

### 2026-06-15/16 — Collateral + campaign content
Photo-forward sell sheet (HTML→PDF), 3-touch email sequence (pricing by inquiry), social launch batch
(IG/FB/X/TikTok/blog + 2-wk calendar + image map), campaign brief. 161 cos imported to HubSpot, channel-
tagged. Brand web-asset kit (29 files) → Cloudinary `monti-trentini/library/`.
