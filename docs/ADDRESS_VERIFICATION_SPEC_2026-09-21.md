# Address Verification (Enrichment Call Console) — spec

**Date:** 2026-09-21 · **Status:** SPEC'D, BUILDING · **Owner:** Rick Posada

## Why

Rick (2026-09-21): "in the enrichment or anywhere we are running a campaign with prospects we
need the look up function to confirm address state, city, town zip code and street address."

Today HubSpot company records already carry `address`, `city`, `state`, `zip` (added 2026-09-09
for the CRM quick-look card — `crm.js` `addressOf()`/`stateOf()`/`mapUrlOf()`), but nothing
anywhere verifies them against a real postal source — they're just formatted for display. The
enrichment/rep-qualification call console (`CallRow`/`RepCallRow` in `campaign-detail.jsx`) is
the one place today where a campaign already works prospects one at a time (matches "in the
enrichment" directly) — it has fields for buyer/title/email/phone/Instagram, but nothing for
address.

## Decisions made (2026-09-21, asked directly)

1. **Verification service** → **Google Address Validation API.** Most accurate, and the CRM
   already builds Google Maps links from these same fields (`mapUrlOf()`), so it's a consistent
   choice. Requires Rick to set up a Google Cloud project + API key (see "Rick's one manual
   step" below) — this is account/billing setup, which Claude does not do on a user's behalf.
2. **Interaction model** → **on-demand, in the call console.** Add street/city/state/zip fields
   to the existing `CallRow` (enrichment) and `RepCallRow` (rep-qualification) with a
   "Verify address" button per prospect. Not a background batch sweep — a rep checks the
   address for the account they're actively calling, same one-at-a-time flow already used for
   email/buyer capture. (A book-wide "unverified address" gap badge, matching the existing
   "No email"/"No buyer" badges, was considered and explicitly deferred — can be added later as
   its own phase if wanted.)
3. **Where it's saved** → **overlay in the enrichment store**, same as everything else a call
   captures (`campaign-enrichment.js` → Netlify Blobs, per tenant). HubSpot is read-only from
   this app (private-app scope has no write access — see `campaign-enrichment.js` header), so a
   verified/corrected address can never be written back into HubSpot directly; it lives
   alongside the buyer/email/phone corrections already captured per company.

## Architecture

Same "no rebuild, server holds the key" pattern as every other outside-API call in this repo
(`crm-hubspot.js` is the model — `HUBSPOT_TOKEN` read server-side only, never reaches the
browser):

```
CallRow "Verify address" button
   │  street/city/state/zip currently in the field (or HubSpot's placeholder values if empty)
   ▼
src/lib/address-verify.js  verifyAddress(resolved, address)
   │  POST + tenant-scoped auth headers (authHeaders(), same as every other write call)
   ▼
netlify/functions/address-verify.js
   │  requireWriteAuth() — client-admin/admin only (this call costs money per lookup;
   │  gated the same as every other write endpoint, not opened to the read-only client tier)
   │  reads GOOGLE_ADDRESS_VALIDATION_KEY server-side, calls Google's
   │  addressvalidation.googleapis.com/v1:validateAddress
   │  maps Google's response down to a small, sanitized shape — never forwards Google's raw
   │  payload or the API key to the browser
   ▼
{ ok, verdict: "confirmed" | "corrected" | "unconfirmed", formatted: {street, city, state, zip} }
   │
   ▼
CallRow patches the enrichment record (street, city, state, zip, addressVerifiedAt, addressVerdict)
   │  via the existing onPatch → patchEnrich → scheduleSave("enrich", ...) debounced autosave
   ▼
netlify/functions/campaign-enrichment.js  (schema extended with the 4 address fields +
   addressVerifiedAt + addressVerdict, same str()-sanitize-everything pattern as buyer/email/etc.)
   ▼
Netlify Blobs, per-tenant "campaign-enrichment" store — same document buyer/email/notes already
live in, read back on every page load, degrades to last-good-state on a failed read.
```

Verdict mapping from Google's response (`result.verdict` + per-component `confirmationLevel`):
- **confirmed** — `addressComplete` true and no unconfirmed/inferred components. Green badge.
- **corrected** — Google returned a different, plausible formatted address (typo fixed, zip
  filled in, etc.). Amber badge — the corrected fields are pre-filled into the row, but a human
  should glance at them before treating them as final.
- **unconfirmed** — Google can't confirm the address as deliverable (bad street, nonexistent
  zip/city combo). Red badge — flags it rather than silently keeping a bad address.

## Rick's one manual step — Google Cloud API key (blocking, not something Claude can do)

Creating a Google Cloud project, enabling billing, and generating an API key is account setup —
outside what Claude does on someone's behalf. Steps:

1. Go to https://console.cloud.google.com and create a new project (or reuse an existing one if
   Rick already has one for the business).
2. In that project, enable the **Address Validation API**
   (https://console.cloud.google.com/apis/library/addressvalidation.googleapis.com).
3. Billing must be enabled on the project to use the API — Google gives a recurring free monthly
   credit that comfortably covers occasional per-call rep use; it will not charge anything at
   this volume, but the project needs a billing account attached to turn the API on at all.
4. Create an API key: **APIs & Services → Credentials → Create credentials → API key.**
   Restrict it (recommended) to just the Address Validation API, under "API restrictions," so
   the key can't be used for anything else if it ever leaked.
5. Send Claude the key value (in this chat, or however Rick prefers) and Claude will set it as
   the `GOOGLE_ADDRESS_VALIDATION_KEY` environment variable on the live Netlify site via the
   Netlify MCP connection — the same way `AGENT_GATE_PASSCODE` and every other server-side
   secret in this app is configured, never typed into a form by Claude.

Nothing above is required for the code itself to ship and deploy — the button will show a clear
"address lookup not configured yet" state until the key is set, then start working immediately,
no redeploy needed (same pattern as every other env-var-gated feature in this app).

## Phased build plan

1. **Netlify function + client lib.** `address-verify.js` (function) + `address-verify.js`
   (lib) — the verification call itself, independently testable once the key exists.
2. **Enrichment schema extension.** `campaign-enrichment.js` accepts + sanitizes the 4 new
   address fields plus verification metadata.
3. **Call console UI.** Street/city/state/zip fields + "Verify address" button + verdict badge
   in `CallRow` (enrichment) and `RepCallRow` (rep-qualification).
4. **Rick's manual step** (parallel, not blocking the code ship): Google Cloud project + API
   key + hand the key to Claude to set as the Netlify env var.

## Next step

Build phases 1–3 now; hand Rick the Google Cloud steps for phase 4 once the code is live so the
feature lights up as soon as he has a key.
