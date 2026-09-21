# Social content drafts — wholesaleimports01 (Instagram)

**Status:** DRAFT — nothing here is scheduled. Each post needs Rick's explicit go-ahead before it's
created in Buffer. **Owner:** Rick Posada · **Read with:** `MARKET_INTELLIGENCE_SPEC.md`,
`src/lib/opportunities.js`, `src/data/montitrentini/signals.json`, `src/data/montitrentini/brand-kit.json`.

## Why this exists
Rick's ask (2026-09-21): use the "industry struggle" signals already flowing into the Opportunity Engine —
recalls, closures, commodity price volatility — as top-of-funnel content on the wholesaleimports01 Instagram
account. The goal isn't a sales pitch; it's building an audience of people watching the industry who might
become buyers later. Same signal data, two different jobs: `suggestedAngle` is for Rick's internal sales
outreach, `socialHook` (new field, see below) is for the public post.

## Rule locked in with Rick (2026-09-21)
**Trend-level only. Never name a specific competitor, brand, or business in public content**, even when the
underlying signal names one internally (e.g. the recalled brand in `sig-italian-import-recall-ca`, or the two
named shops in `sig-independent-retail-closures`). Naming them publicly is a defamation/accuracy risk, not
just a brand-voice one. The `_socialNote` field on those two signals in `signals.json` flags this inline so
it isn't missed later.

## What changed in the data model
- **`signals.json`** — three signals now carry `socialReady: true` + a `socialHook` (a public caption
  opener, already scrubbed of names/specifics): `sig-cheddar-price-surge`, `sig-italian-import-recall-ca`,
  `sig-independent-retail-closures`. Not every signal is social-ready — internal sales signals (distributor
  resets, USDA forecasts) stay internal-only.
- **`brand-kit.json`** — the three story blocks these signals point to (`origin-provenance`,
  `supply-chain-quality`, `retail-partnership`) now carry a `socialLine`: a shorter, social-voice version of
  the story, distinct from the buyer-facing `body` copy used in quotes/proposals.
- A caption below = `socialHook` (what's happening in the industry) + `socialLine` (the MT contrast) + a CTA.

---

## Draft 1 — commodity volatility
**Signal:** `sig-cheddar-price-surge` · **Story:** supply-chain-quality

> Commodity cheddar just jumped 16.5% in a single auction — a reminder of how volatile "just a commodity"
> pricing can get.
>
> We do everything at home: milk processing, cheesemaking, aging, and packaging, all in our own plants, by
> the people who make it. Nothing outsourced. Nothing anonymous. That's not a hedge against price swings —
> it's just how a hundred-year family creamery works.
>
> #ItalianCheese #Asiago #DOP #WholesaleCheese #SpecialtyFood #ImportedCheese

## Draft 2 — recall / traceability
**Signal:** `sig-italian-import-recall-ca` · **Story:** supply-chain-quality + origin-provenance

> Another imported specialty cheese recall hit shelves this week — a reminder that "imported" doesn't
> automatically mean traceable.
>
> Casa Finco has made cheese in the Trentino mountains since 1925 — four generations, one neighborhood, milk
> from within 90km of our dairy in Grigno. When you can trace it that closely, traceability isn't a claim.
> It's just what's true.
>
> #FoodSafety #Traceability #ItalianCheese #DOP #WholesaleImports #SpecialtyFood

## Draft 3 — independent retail pressure
**Signal:** `sig-independent-retail-closures` · **Story:** retail-partnership + origin-provenance

> Two more independent specialty cheese shops closed their doors this month — squeezed by margin pressure and
> shelves that all look the same.
>
> A hundred-year family story is the kind of differentiation an independent shelf can build around — not
> another SKU next to the same five brands everyone else carries. Happiness has plenty of shapes; we help
> independents put a real one on the table.
>
> #SupportIndependent #SpecialtyCheese #CheeseShop #ItalianImport #WholesaleCheese

---

## Open questions for Rick
1. Do these captions read right for wholesaleimports01's actual audience/tone, or do they need a pass?
2. Posting cadence — one of these a week? Tied to when a new struggle signal surfaces?
3. Once a caption is approved, should each post link back anywhere (site, a contact form), or is this pure
   brand-awareness with no CTA link for now?
4. Should future struggle signals auto-generate a draft here for review, or do you want to keep picking them
   by hand from the Opportunities/market-news feed?

## Next step
Nothing gets scheduled until Rick approves specific copy. Once approved, Claude creates the post as a
**draft** in Buffer (channel: wholesaleimports01, id `6aa5faa8c56320b7764395b5`) for Rick to review in Buffer
before it goes live — not published directly.
