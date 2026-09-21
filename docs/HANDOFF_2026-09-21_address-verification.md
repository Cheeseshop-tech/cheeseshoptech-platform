# Handoff — Address verification in the enrichment call console (2026-09-21)

**Spec:** `docs/ADDRESS_VERIFICATION_SPEC_2026-09-21.md`

## What shipped

Rick, 2026-09-21: "in the enrichment or anywhere we are running a campaign with prospects we
need the look up function to confirm address state, city, town zip code and street address."

1. **`netlify/functions/address-verify.js`** (new) — POST `{tenant, street, city, state, zip}`,
   requireWriteAuth-gated (client-admin/admin only, same as every other write endpoint), calls
   Google's Address Validation API server-side with `GOOGLE_ADDRESS_VALIDATION_KEY` (never
   reaches the browser), returns a small sanitized shape:
   `{ok, verdict: "confirmed"|"corrected"|"unconfirmed", formatted: {street, city, state, zip}}`.
   Answers `{ok:false, error:"not-configured"}` cleanly (HTTP 200) when the key isn't set yet,
   so the UI can show a clear message instead of a generic failure.
2. **`src/lib/address-verify.js`** (new) — thin client wrapper, `verifyAddress(resolved, addr)`,
   built on the same `writeAuthedJson` every other write call site uses.
3. **`netlify/functions/campaign-enrichment.js`** (extended) — the enrichment record shape now
   also carries `street, city, state, zip, addressVerdict, addressVerifiedAt`, sanitized the
   same way every existing field is (`str()`, length-capped, allowlisted enum for verdict).
4. **`src/components/campaigns/campaign-detail.jsx`** (`CallRow`, the enrichment call console)
   — added Street address / City / State / Zip fields (pre-filled from HubSpot's `address`/
   `city`/`state`/`zip` as placeholders, editable/correctable exactly like buyer/email/phone
   already are) plus a **Verify address** button. On verify: patches the row with Google's
   corrected fields and shows a badge — green "Address confirmed," amber "Address corrected —
   review," or red "Address unconfirmed" — using the same autosave path (`onEnrich` →
   `patchEnrich` → debounced save) every other field in this row already uses.

Verified: `eslint` on all four touched/new files — 0 errors (4 pre-existing warnings elsewhere
in the file, unrelated to this change). `vite build` — transform stage succeeded (2061 modules,
0 errors); the build then hit the same pre-existing sandbox `.DS_Store` unlink permission quirk
documented in `CLAUDE.md`, not a code issue.

## Scope decision: NOT added to `RepCallRow` (sales-rep panel)

The clarifying question that scoped this build mentioned `CallRow`/`RepCallRow` together, but
once I actually read `RepCallRow` closely it's a different thing: it confirms a **distributor's
own sales rep's territory** ("what's your territory," not "will you come to the show"), not a
prospect's mailing address. Adding street/city/zip fields there wouldn't make sense — there's no
"prospect address" concept in that panel at all. Address verification only went into `CallRow`
(the actual prospect/target-account call console), which is what "running a campaign with
prospects" actually refers to. Flagging this explicitly in case Rick did want something on the
rep panel too (e.g. verifying a rep's own mailing address) — that would be a different, smaller
follow-up if so.

## NOT done yet — Rick's one manual step

The button works end-to-end but silently no-ops with a "Address lookup isn't set up yet — ask
Rick" message until `GOOGLE_ADDRESS_VALIDATION_KEY` exists. That requires Rick to set up a
Google Cloud project + billing + API key (account/billing setup — not something Claude does on
someone's behalf). Full steps are in the spec doc under "Rick's one manual step." Once he has
the key, hand it to Claude and it gets set as the Netlify env var the same way
`AGENT_GATE_PASSCODE` was — no redeploy needed, the feature lights up immediately.

## Also not done (out of scope for this pass, flagged for later)

- No book-wide "unverified address" gap badge (matching the existing "No email"/"No buyer"
  badges on the segment header) — this was explicitly deferred in the spec's decision #2, an
  on-demand per-row check only. Easy follow-up if Rick wants addresses surfaced before a rep
  even picks up the phone, same pattern as the existing gap panel.
- Verified/corrected addresses are NOT pushed to HubSpot (HubSpot is read-only from this app —
  same constraint every other enrichment field already lives with). They export in the existing
  HubSpot-import CSV path if that gets extended to include address columns — not done here,
  since `enrichmentCsv()`/the CSV columns weren't part of what was asked for this pass.
