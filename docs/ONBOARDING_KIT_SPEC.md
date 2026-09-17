# Buyer Onboarding Kit — spec (not built)

**Date:** 2026-09-17 · **Status:** SPEC ONLY — direction set by Rick, build not scheduled
**Origin:** grew out of the Cut & Wrap precut photo catalog + Photo Framing tool work this session
(2026-09-17). Builds directly on the existing Proposal engine (`src/lib/proposals.js`,
`src/components/proposals/proposal-view.jsx`) and the already-speced
`docs/PROPOSAL_BUYER_EMAIL_GATE_SPEC.md` — this is not a new system, it's those two put together
plus a few new fields.

## The idea (Rick, 2026-09-17)

Not a pitch deck — a reference packet for an account that has already signed on: "here is
everything about the specific assortment you're now carrying." Deeper per-item content than a
sales proposal needs (spec sheets, nutrition, training video links, pairing suggestions, alternate
photography, long-form copy), shared as a link that gets emailed and gated to that one buyer.

## Relationship to existing systems

- **Reuses the Proposal engine's SKU-picker and share-link mechanics almost entirely.** An
  Onboarding Kit is a curated, ordered list of SKU codes — exactly what `proposal.skus` already
  is. Forking `proposal-builder.jsx`'s picker is the right move, not a new selection UI.
- **Adopts the buyer-email gate design from `PROPOSAL_BUYER_EMAIL_GATE_SPEC.md` as-is** rather
  than re-designing access control — same `requireBuyerAuth()` concept, same
  pre-authorized-email + contact-capture value that spec already worked out. Building it once
  unblocks both features.
- **Diverges from Proposals in payload size and intent.** Proposals deliberately carry everything
  in the URL hash (stateless, no backend, ~1–3 KB — see `proposals.js`'s own header comment). An
  Onboarding Kit's per-item content (training video links, spec-sheet PDFs, pairing copy, several
  photos per item, long descriptions) is both too large for a URL and too likely to be edited
  after the link is already in someone's inbox. It needs a real backend record, not a bigger hash.

## Data model (new)

```
OnboardingKit — Netlify Blobs, keyed by tenant + kit id (same store pattern as campaign-state.js)
{
  v: 1,
  tenantId, kitId,
  buyerName, buyerId,            // same CRM-account join as proposal.buyerId
  authorizedEmails: [],          // reuses the buyer-gate design below — not a new mechanism
  createdAt, updatedAt,
  themeId,                       // kit gets its own theme(s) — not necessarily the proposal themes
  headline, intro,
  items: [
    {
      code,                       // SKU — joins to items.js / catalog.json, exactly like proposal.skus
      longDescription,            // NEW — kit-specific buyer framing, not stored on the canonical
                                   //   item record since it may read differently kit to kit
      pairingNotes,                // NEW — wine/accoutrement suggestions; editorial, not a compliance claim
    }
  ],
}
```

Everything else a kit needs already has a canonical home and is referenced live by SKU code,
never copied into the kit record — same non-negotiable principle `proposals.js` already states
("references canonical data by key/code and NEVER copies"):

| Content                     | Lives in                                   | Status |
|------------------------------|--------------------------------------------|--------|
| Training video links         | `items.js` `trainingVideoLinks` field       | Shipped this session |
| Alternate photos / hero order | `images.json` manifest, usage tags          | Shipped this session |
| Spec-sheet PDFs               | `images.json` records with `kind:"document"` | **Already shipped** — see below |
| Structured nutrition/allergen data | Product Compliance Documents               | Blocked — needs Rick's source data; never AI-composed |
| Pricing                       | (deliberately absent — see Non-goals)       | N/A |

**Spec sheets are NOT blocked** — corrected 2026-09-17 after re-reading
`HANDOFF_2026-09-17_media-roles-and-spec-sheets.md` and verifying against the live manifest. The
`resource_type: raw` fetch path shipped in both `media-list.js` and `sync-images.mjs`, records
carry `kind: "document"`, and 15 real PDFs sit in the manifest today — 13 gated to active codes
(`01174, 02091, 03044` ×2 revs, `03073, 04182, 20424, 20480, 20481, 30014–30017`), all
`approved-for-press`. `buyer-catalog.jsx` already renders them as a "Spec sheet(s)" download
section, so an Onboarding Kit inherits working spec sheets for those 13 SKUs on day one rather
than a "coming soon" placeholder. What IS still open is separate and smaller: `01114` and `20482`
are spec sheets for item numbers not in the active catalog (plus `01286` from a photo batch) — a
few clicks in Media Hub for Rick, not a build task.

## Access + delivery

1. Rep builds a kit in a new **Onboarding Kit builder** (sibling to `proposal-builder.jsx`): pick
   SKUs, write kit-level intro, optionally add a long-description override and pairing notes per
   item.
2. Save writes the kit record via a new `onboarding-kit-update.js` Netlify Function — same
   `requireWriteAuth()` + `logWrite()` pattern as every write shipped this session
   (`media-update.js`, `media-upload-sign.js`).
3. Share link carries a short id only (`?kit=<kitId>`) — no payload in the URL. Read via a new
   `onboarding-kit-get.js` function.
4. **Gate:** build `requireBuyerAuth()` from `PROPOSAL_BUYER_EMAIL_GATE_SPEC.md` now — buyer
   enters their email, matched against `authorizedEmails`, contact-capture logged exactly as that
   spec describes. This is the one piece of net-new infrastructure, and it pays for both features.
5. **Delivery:** rep clicks "Email this kit" and it drafts through Gmail (connected this session)
   with the gated link — a real send, not a simulated one. Once the gate exists, "make it seem
   like it ships via email" isn't needed — it actually does.

## Build order (smallest safe increments)

1. `requireBuyerAuth()` + the email-gate UI (shared foundation — unblocks Proposals v2 too).
2. `onboarding-kit-update.js` / `onboarding-kit-get.js` (mirrors `media-update.js`'s shape).
3. Onboarding Kit builder UI — fork `proposal-builder.jsx`'s SKU-picker, drop the pricing/tier
   UI, add `longDescription` + `pairingNotes` fields.
4. Kit view page — fork `proposal-view.jsx`'s themed grid, add training-video-link buttons, reuse
   `buyer-catalog.jsx`'s existing alternate-photo lightbox rather than building a second gallery.
5. Spec-sheet download links — reuse `buyer-catalog.jsx`'s existing "Spec sheet(s)" section and
   `cldDocDownload()`; these work today for the 13 gated SKUs, no new fetch path needed. Only
   structured nutrition/allergen *data* stays a "coming soon" slot until Product Compliance
   Documents lands (same honesty pattern already used for "Photo coming soon").

## Non-goals (v1)

- No pricing in the kit — that's what Proposals is for; this is reference material, not a quote.
- No self-serve buyer accounts (same non-goal as the email-gate spec).
- No AI-composed nutrition/allergen data, ever — existing hard rule, unaffected by this feature.

## Open questions for build time

- Does a kit expire, or stay live indefinitely once an account is onboarded? (Proposals have
  `validUntil`; a reference kit arguably shouldn't.)
- One kit per account, or can an account accumulate kit versions as its assortment changes over
  time?
- Does the buyer-gate's contact-capture matter here too (probably yes — same lead-visibility
  value), or is it noise for an account that's already signed?
