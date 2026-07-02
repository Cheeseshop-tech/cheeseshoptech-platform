# Content Engine Wiring — Content Studio ⇄ everything, and the intelligence in the middle

**Status:** Spec (2026-07-02, Rick + Claude). Builds on what EXISTS — nothing here starts from zero.
**Reads with:** `SLOT_MANIFEST_SCHEMA.md` · `TEMPLATE_ENGINE_SPEC.md` · `MARKET_INTELLIGENCE_SPEC.md` ·
`AI_TOOL_EMBED_SPEC.md` (parked) · `BRAND_KIT_AND_PROPOSAL_SPEC.md`.

---

## 1. The one-sentence architecture

**Brand Systems Engine is the source of truth (kits out) → Content Studio is the assembly line
(campaigns out) → the kit JSON is the conveyor** — and the "intelligence" is a **Studio Director**
pipeline that resolves every slot of a template from the right upstream system automatically, so a
human (or an agent) only makes *choices*, never *assemblies*.

```
Brand Systems Engine ──ᵏⁱᵗ ᴶˢᴼᴺ──▶ ┌──────────────────────┐
  · Brand Guide                    │    CONTENT STUDIO     │
  · Brand Voice ──ᵛᵒⁱᶜᵉ ᵇˡᵒᶜᵏˢ───▶ │                       │──▶ Content Library
  · Brand Design (design system)   │  templates (manifests)│      (finished pieces)
Media Hub / Cloudinary ──ᵃˢˢᵉᵗˢ──▶ │  + STUDIO DIRECTOR    │
Opportunity Engine ──ᵂᴴᴼ/ᵂᴴᵞ─────▶ │    (the intelligence) │
Catalog / Pricing ──ˢᴷᵁˢ─────────▶ └──────────────────────┘
```

## 2. The five wires (what feeds which slot role)

Every template slot = **role × kind × binding** (Slot Kit language, already locked). The wiring
below says which system RESOLVES each binding at render time. This is the whole contract.

| Wire | Source | Feeds slots | Mechanism (exists ✓ / to build ●) |
|---|---|---|---|
| **1. Brand Kit** | `brand-kit.json` per tenant (Brand Kits page edits it; BSE kit JSON is the same schema, v1.1 canonical MT kit) | every `LOCK` slot: `$accent` `$display` `$logo` `$seal` colors/fonts | ✓ `lib/brand-tokens.js` → `brandTokens(resolved)`, `resolveTok` |
| **2. Brand Voice** | kit `voice` + `storyTopics` + story blocks (authored in BSE's Voice discipline) | `text`/`story` slots: ready phrases, story angles, attribution, mottos | ✓ `voiceOptions` in brand-tokens.js · ● BSE→kit sync (§4) |
| **3. Media Hub / Cloudinary** | tagged assets, cloud `sofcvmwa`, 12-tag usage taxonomy | `image` slots — `tag` on the slot pre-filters the picker (e.g. `hero`, `product-catalog`) | ✓ `MediaPicker` (`defaultTag = slot.tag`), `listAssets()` seam, `cldImage()` |
| **4. Design System** | the platform component catalogue + template manifests (`slide-templates.js`, house IP) + theme registers (`lib/themes.js`, 5) | layout itself: which slots exist, where, z-order; density/type register | ✓ manifests + `slide-renderer.jsx` · ✓ flow mode POC · ● flow renderer port |
| **5. Market intelligence** | Opportunity Engine (`rankOpportunities`: CRM × signals × brand-fit) | the SEED: buyer, audience, headline, intro, storyKeys, skuCodes → pre-fills the draft | ✓ Compose → `saveDraft` → builder |

**Rule that keeps this sane (already canon):** templates are *platform-shared* and tokenized; ALL
brand specificity enters through wires 1–3. Never hard-code a client hex/font/photo in a manifest.

## 3. The Studio Director — the intelligence in the process

Not a chatbot. A **resolver pipeline with escalating smarts**, run when a compose starts (from an
Opportunity "Compose" click, or "New" in the Studio). Each stage is useful alone; each later stage
is optional and additive — same seam philosophy as every backend.

**Stage 0 — Deterministic auto-fill (build FIRST, no AI, no cost).** `lib/studio-director.js`:
`directDraft({ resolved, opportunity?, templateFamily })` returns a *fully-resolved draft*:

1. Pick template(s) for the content type (deck → cover + story + range + CTA sequence).
2. `LOCK` slots → painted from kit tokens (already automatic in the renderer).
3. `text`/`story` slots → best-match voice block: match slot `as`/tags against `storyTopics` +
   opportunity `storyKeys` (the brand-fit selector already ranks these — reuse its scoring).
4. `image` slots → best-match Media Hub asset: slot `tag` → tag-filtered `listAssets()`, prefer
   approved + SKU-linked when the draft has `skus` (join key = SKU, per DATA_OWNERSHIP_MAP).
5. `product` slots → SKUs from the opportunity's `skuCodes` (catalog is canonical — never copy
   pricing into content; quote live like proposals do).

Output = the same draft shape `SlideStudio` edits today. The human's job collapses to *review and
swap*. This is ~80% of the perceived "AI magic" at $0.

**Stage 1 — Rules of taste (heuristics, still no AI).** Don't reuse the same image twice in a
deck · hero slots prefer `hero`-tagged landscape assets · statement slides pull the shortest
punchy voice line, story slides the long blocks · audience-aware theme register (foodservice →
Chef's Table, distributor → Trade Brief — the crosswalk `audienceOf` exists).

**Stage 2 — AI pass (the parked embed, now with a real job).** Per `AI_TOOL_EMBED_SPEC.md`
pattern: browser → Netlify function (holds `ANTHROPIC_API_KEY`) → Claude → back. The function
`studio-director.js` takes the Stage-0/1 resolved draft + kit voice rules + the opportunity, and
returns ONLY: rewritten copy per text slot (in voice), a slide-order suggestion, and an image
choice per slot **from the candidate list the deterministic pass supplies** (IDs only). Hard
rules kept: **no image generation** — it selects real Media Hub photography; it edits copy, never
brand tokens. Unpark when: Anthropic pay-as-you-go billing + spend cap set (Rick), and Stage 0/1
shipped. Until then, the Director role = Claude in Cowork writing into the same draft shape.

**Stage 3 — Dispatch awareness (later).** The Director learns destinations: same manifest fanned
to slide/social/email/landing (Option A: one slot vocabulary, two layout modes), with per-channel
copy lengths from the voice doc. Ties into Campaigns + the usage taxonomy (tags map 1:1 to
dispatch destinations — that's why the taxonomy exists).

## 4. Gaps to close (build order)

1. **BSE → Brand Kit sync (the conveyor's missing bolt).** The BSE emits portable kit JSON; the
   app reads `brand-kit.json` per tenant. v1: "Import kit JSON" button on the Brand Kits page
   (schema already matches — canonical MT kit v1.1 was built from the same sources). Later: BSE
   saves straight to the tenant kit via a gated function. **Also: gate the BSE** (still open —
   it carries the full MT kit publicly, unlisted-but-ungated).
2. **`lib/studio-director.js` Stage 0 + 1** — pure functions, testable, no new deps. Wire a
   "Auto-compose" button in `SlideStudio` (the `PARKED(ai-embed)` marker is the spot).
3. **Voice blocks addressable by key** — story blocks/phrases need stable IDs so the Director and
   the AI pass can reference them (today they're picked by index/label).
4. **Flow renderer port** (landing/email) so the Director's output isn't slide-only.
5. **Stage 2 function** — after Rick's billing prereqs. Cents per compose; cap it.

## 5. What this buys, in CST terms

The pitch becomes literal: *"our platform composes on-brand campaign content from your own brand
system, your own photography, and this week's market signals — automatically."* Stage 0 makes it
true deterministically; Stage 2 makes it eloquent. Templates + Director = house IP, never
transferred at buyout.
