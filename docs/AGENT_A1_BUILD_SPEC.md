# Agent A1 Build Spec — solidify the wiring, ship the first Content Engine agent

**Status:** Parts A and the doc fix are BUILT (2026-07-15). Part B turned out to already be built
before this spec existed — see §3, corrected below. Part C (Stage 2 AI) is **BUILT 2026-07-19** —
see §4. Part D (visual direction) and Part E (pipeline-stage toggle, added this pass) are not started.
**Reads with:** `DATA_OWNERSHIP_MAP.md` · `CONTENT_ENGINE_WIRING_SPEC.md` · `ONBOARDING_AND_AGENTS_SDD.md`
(Part 3, A1) · `AI_TOOL_EMBED_SPEC.md` · `DESIGN_SYSTEM.md`.

**Confirmed scope (Rick, 2026-07-15):**
1. Wiring fix = rewire the agent's data path onto the canonical modules + correct the stale
   ownership doc. Not a full dedupe of `catalog.json`/`items-seed.json` (that's a separate, larger
   follow-on — logged in §6).
2. Agent scope = ship with Stage 2 (AI pass) included, not Stage 0/1 alone. **This is blocked on a
   prerequisite only Rick can clear — see §4.**
3. UI = a new visual direction for the CST platform itself (not the Monti Trentini tenant brand),
   starting with the Agent's own UI surfaces. Concepts before commitment — nothing in the locked
   `DESIGN_SYSTEM.md` changes until Rick picks a direction.

---

## 1. Where this sits

Per `ONBOARDING_AND_AGENTS_SDD.md` Part 3, **A1 — Content / Design Engine Agent** is the first of
five planned agents, substrate = Studio Director (`CONTENT_ENGINE_WIRING_SPEC.md` §3), marked
"data gap: none, first agent to ship." The audit that produced this spec found that claim was
half true: the substrate (`src/lib/studio-director.js`) is real, working code — Stage 0
(deterministic slot-resolver) and Stage 1 (heuristic image/copy scoring) both run today. But two
things are wrong under it:

- It reads copy from `catalog.json`'s own `name`/`marketing.blurb` fields and images from a live
  Cloudinary listing (`src/lib/media.js: listAssets()`) — a path parallel to, not through, the
  canonical `src/lib/items.js` / `src/lib/images.js` manifests that Product Catalog and Media Hub
  already share. Wiring the agent to the same "one mind, one body" source it's supposed to prove
  out was never finished.
- It has no UI trigger. `CONTENT_ENGINE_WIRING_SPEC.md` §4 already lists "Auto-compose button not
  wired into SlideStudio" as an open gap.

So "first agent to ship" currently meant: substrate built, copy sourced from the wrong place,
images actually fine. **Both corrected below — this spec's original Part A plan for images was
wrong and was not carried out; the actual fix was narrower.**

## 2. Part A — Rewire the data path (BUILT 2026-07-15)

**File:** `src/lib/studio-director.js`

Before writing code, re-reading `media.js` and `images.js` closely changed the plan from what this
spec originally said:

- **Images were never actually wrong.** `media.js: listAssets()` IS the Media Hub — same mock data
  and same `/.netlify/functions/media-list` endpoint the Media Hub UI itself uses. `images.js:
  imageForCode()` is a *different, narrower* tool: a static generated manifest keyed one-image-
  per-SKU, with no usage tags (hero/lifestyle/brand-asset) and no approval state — it cannot serve
  `pickAsset()`'s job (score a candidate pool by tag + approval + SKU for cover/story/product
  slots). Switching to it would have been a regression. **No change made here.**
- **Copy was the real gap, and narrower than described.** The current 6 slide templates
  (cover/statement/story/image/product-range/closing) don't have a long-form description slot —
  they use Brand Kit voice lines and story blocks for all body copy. The one place actual product
  *data* leaked in was `pickProducts()`: product-range slide names came from `catalog.json`'s own
  `product.name` field, not the canonical `items.js` record Product Catalog uses. A third, unused
  image path also existed in the same function (`p.skus.find(...).image` from catalog.json) that
  the slide builder never actually consumed — removed as dead code in the same pass.
- **`descriptionFor()` still has no caller.** None of the 6 templates have a slot for it. Left as
  documented, ready for the day a template needs long-form product copy (e.g. a future "product
  detail" slide, or email/social generation) — not invented a use for it here.

**What actually changed:** `directDraft()` now loads the tenant's `items.js` doc
(`loadItems(resolved.cloudinaryFolder)`, same call Product Catalog makes) and `pickProducts()`
prefers `getItem(itemsDoc, code)?.name` over `catalog.json`'s `p.name`, falling back to the latter
for SKUs not yet entered in the items doc. No change to `catalog.json` schema, `pricing.js`, or
`items-seed.json` in this pass — pricing data stays exactly where it is.

**File:** `docs/DATA_OWNERSHIP_MAP.md` — **fixed 2026-07-15.**

It stated (2026-06-13) "Product short/long descriptions are PRODUCT data — do NOT add them to the
Media Hub" — superseded by the 2026-07-03 decision in `items.js`'s own header ("Media Hub = item
truth") and never updated. Rewrote the domain table (Product identity+copy vs. Pricing are now two
rows, not one), the SKU join diagram, and "what this means for current surfaces" to match what
`items.js` actually does today. Logged the still-open `catalog.json`/`items-seed.json` duplicate
name/blurb fields explicitly as tracked-not-fixed (§6 here).

## 3. Part B — Wire the agent into the UI (Stage 0/1) — **already built, no action taken**

**File:** `src/components/presentations/slide-studio.jsx`

Correction to this spec's original claim: `CONTENT_ENGINE_WIRING_SPEC.md` §4 lists "Auto-compose
button not wired into SlideStudio" as an open gap, and the SDD audit that fed this spec repeated
that claim. **Reading the actual file before touching it showed this is stale — the button already
exists**, in two places: the empty-deck state ("Let the Director set the table" card, prominent CTA)
and the toolbar once a deck exists ("Auto-compose", replaces the whole deck). Both call
`autoCompose()`, which calls `directDraft({ resolved, user, opportunity })` and loads the result
into the editor for slot-by-slot review — exactly the flow this spec set out to build. Nothing to
build here; it now runs on the corrected data path from Part A automatically, no separate change
needed. The wiring-spec's gap list (§4, item 2) and the SDD's framing of A1 as "not yet exposed"
are both stale and worth a quick correction pass themselves, outside this spec's scope.

## 4. Part C — Stage 2, the AI pass — BUILT 2026-07-19

Per `CONTENT_ENGINE_WIRING_SPEC.md` §3 and `AI_TOOL_EMBED_SPEC.md`, Stage 2 is a Netlify function
that holds `ANTHROPIC_API_KEY`, takes the Stage 0/1 resolved draft + brand voice rules, and returns
rewritten copy in voice + a slide-order suggestion + an image pick **from the candidate list only**
(no image generation, ever — it selects real Media Hub photography).

**Billing checklist — all done 2026-07-19:**

- [x] **Anthropic pay-as-you-go API billing** live at console.anthropic.com (separate billing
      surface from the Claude subscription, per `AI_TOOL_EMBED_SPEC.md`) — was already active
      (Visa on file, $20 credit balance) when checked.
- [x] **Console spend cap set to $25/mo** (Rick's number), with an email alert at $20 so there's
      warning before the hard ceiling.
- [x] `ANTHROPIC_API_KEY` created (key name `cst-content-engine`, no expiration) and dropped into
      Netlify env vars for `cheeseshoptech-platform`, scoped to **Builds, Functions, Runtime only**
      (same pattern as `CLOUDINARY_API_SECRET`) and marked as a secret value. Netlify confirms
      "1 value in 1 deploy context" (Production).

Note on process: the first two attempts at creating the key lost the one-time-reveal value before
it reached Netlify (copied but not pasted in time) — those orphaned keys were deleted in the
Console before the third attempt succeeded. Nothing was ever exposed in chat; the key value itself
was never captured in any screenshot or message.

**What was built (2026-07-19):**

- **`src/lib/studio-director.js`** — additive change, no behavior change to Stage 0/1's picks.
  `pickAsset()` now also collects up to 5 qualifying candidate publicIds (score ≥ 2, same bar as
  the pick itself) into a `candidatesOut` array; the picked winner is always `candidatesOut[0]`.
  Every image slot in the deck now carries `slots.__candidates[slotId] = [publicId, ...]` — same
  convention as `__off`/`__img`, an extra key the renderer/inspector already ignore. This is what
  lets Stage 2 offer a real alternate instead of inventing one, per the wiring spec's "from the
  candidate list the deterministic pass supplies (IDs only)" requirement.
- **`netlify/functions/ai-compose.js`** — the Stage 2 function. `requireReadAuth` (any unlocked
  portal tier, same bar as browsing Media Hub — this doesn't write to Cloudinary, "Save to Library"
  is separate). Reduces the deck to only what's editable (a `slotKind()` heuristic: `image`/`img\d*`
  keys are image slots, plain strings are text, `{headline,narrative}` shapes are story blocks;
  `contact` and any `__`/`$`-prefixed key are never shown to the model at all). Calls the Anthropic
  Messages API with a forced tool call (`return_compose`) so the response is structured JSON, not
  parsed prose. Model defaults to `claude-3-5-sonnet-20241022`, overridable via an `ANTHROPIC_MODEL`
  Netlify env var without a code change. **Every field in the model's response is re-validated
  server-side against the ORIGINAL deck before merging** — an image edit is accepted only if it's a
  member of that exact slot's `__candidates` list (never a new/hallucinated id); a text edit is
  accepted only for a slot the briefing itself classified as editable. A slide-order suggestion is
  accepted only if it's a full, valid permutation of the deck's indices. This means the hard rules
  (no image generation, never touch brand tokens/contact) hold even if the model ignores the system
  prompt — defense in depth, not just prompting. Guardrails: deck capped at 20 slides, briefing
  capped at 24k chars, `max_tokens: 2000`, 25s abort timeout, every call logged via `logWrite()`
  (`fn: "ai-compose"`).
- **`src/components/presentations/slide-studio.jsx`** — new "AI Polish" toolbar button (Sparkles
  icon) next to "Auto-compose", enabled once a deck exists. Sends the current deck (already
  carrying `__candidates`) + the tenant's `getBrandKit(resolved)?.voice` + the opportunity to the
  function, merges the returned deck back in (applying the order suggestion if present), and shows
  a one-line result/error message under the toolbar. Nothing else in the existing Stage 0/1 flow
  changed — this is a second, optional pass a human can run (or not) after Auto-compose, review-and-
  swap still applies exactly as before.

**Scope note — image re-selection is real but conservative in v1.** The wiring spec's Stage 2
description is fully implemented (copy rewrite + order + image pick from real candidates), but
`pickAsset()` only ever surfaces up to 5 alternates per slot from assets already scored ≥ 2 — for
thin tenants (few tagged photos) a slot may have zero or one candidate, in which case the model has
nothing to swap to and the deterministic pick simply stands. That's the intended "empty/unchanged
beats a wrong photo" behavior, not a bug.

## 5. Part D — New visual direction (CST platform, not tenant brand)

Confirmed: this is about **CheeseShop TECH's own platform chrome** — house console, agent UI,
admin surfaces — not Monti Trentini's (or any tenant's) brand, which is intentionally
house-owned and separate (`DATA_OWNERSHIP_MAP.md`: "Brand stays house-only"). `DESIGN_SYSTEM.md`
is LOCKED and verified consistent with the actual code (Terracotta/Cellar Olive palette, Fraunces/
Inter/JetBrains Mono, the "Ledger" italic heading treatment) — so this isn't a repair, it's a
proposed evolution, and nothing in the locked doc changes until a direction is picked.

Plan: produce 2–3 concept directions (mood + palette + type pairing + one worked screen — likely
the new Auto-compose / agent-review surface from Part B, since that's the first new UI this spec
creates) for you to react to, before anything touches `DESIGN_SYSTEM.md` or `tailwind.config.js`.
This happens after Parts A/B ship, so the concept work has a real screen to be designed against
instead of a hypothetical one.

## 6. Explicitly deferred (not in this pass)

- **Full data dedupe** — removing `name`/`marketing.blurb` from `catalog.json` and
  `items-seed.json` so Price List Creator also reads product copy from `items.js`. Real fix, bigger
  blast radius (touches `pricing.js` and the catalog data schema); logged here so it doesn't get
  lost, not scoped further until Parts A–D are done.
- **Agents A2–A5** — per the SDD's own build order, these come after A1 and have real data gaps
  (sales history, HubSpot deals, `goals.json`) that A1 doesn't have. Out of scope here.

## 7. Part E — Post-sale pipeline stages, flagged off (added 2026-07-15, not built)

From the call-center workflow discussion: CRM's `PIPELINE_STAGES` (`src/lib/crm.js`) currently
stops at `Lead → Qualified → Sample sent → Negotiation → Won`. Everything after a closed sale —
PO received, order processing, shipped, billed, collected — happens today with no record in the
app at all, not even a stage marker. Rick's call: write the stages in now, but **behind an
off-by-default toggle**, so the shape exists without committing to workflow changes or false
signal (a stage nobody updates is worse than no stage).

**Design (not yet built):**
- Extend `PIPELINE_STAGES` with the post-sale stages, gated by a new boolean —
  `resolved.features?.extendedPipeline` (client.config.json, per-tenant, default `false`/absent) —
  mirroring the existing `VITE_*_BACKEND` flag pattern in `INTEGRATION_WIRING_BRIEF.md`, but a
  per-tenant data flag rather than a build-time env var, since this is a workflow choice, not a
  backend-readiness one.
- Add stages: `PO Received`, `Processing`, `Shipped` (real, usable once flagged on — these have no
  billing dependency) and `Billed`, `Collected` (present in the list, but deliberately inert —
  no AR math, no invoice generation behind them; they're placeholders per Rick's "keep it in the
  shadows" framing, same spirit as the mind-map's dashed future zone).
- Surface the toggle itself somewhere in house-admin settings (exact location TBD — Client Tier
  settings or Brand Management are the two existing house-admin surfaces; needs a look before
  picking).
- **Priority: after Parts A–D.** Rick asked to prioritize inter-app wiring and the first agent over
  this — captured here so it isn't lost, not scheduled yet.

## 8. Build order

1. ~~Part A — rewire `studio-director.js`'s copy path to `items.js`; fix `DATA_OWNERSHIP_MAP.md`.~~
   **Done 2026-07-15.**
2. ~~Part B — Auto-compose UI in Slide Studio.~~ **Already built before this spec existed — found,
   not built, 2026-07-15. First agent ships functionally as of Part A landing.**
3. ~~Part C — Stage 2 Netlify function.~~ **Done 2026-07-19** — `ai-compose.js` built, wired into
   Slide Studio as "AI Polish", billing/spend-cap live.
4. Part D — visual direction concepts, scoped against the real Auto-compose/review screen.
5. Part E — flagged pipeline stages, lowest priority of the five.

---
*Parts A/B/C done (2026-07-15, 2026-07-19). Parts D and E are unstarted and unscheduled.*
