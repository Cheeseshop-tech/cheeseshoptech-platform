# Proposal Buyer Email Gate — spec (not built)

**Date:** 2026-07-16 · **Status:** SPEC ONLY — direction set by Rick, build not scheduled
**Origin:** decision made during the P0 read-endpoint auth fix (see BUILD_LOG 2026-07-16).
Related: the "personalized, email-gated Presentation Library" plan (BUILD_LOG 2026-07-06 cont. 6).

## The decision (Rick, 2026-07-16)

Proposals are sent via email directly to buyers. Buyer access to a proposal link is gated by a
**pre-authorized buyer identity (email)**, not the shared tenant passcode. The gate step doubles
as **email-contact capture** — every buyer who opens a proposal identifies themselves, feeding
the contact book (and eventually HubSpot).

## Current state (post read-guard fix, 2026-07-16)

- `ProposalView` sits behind the tenant `PasscodeGate` — a buyer must be given the shared base
  passcode to open a proposal link at all. That's the thing this feature replaces: the shared
  passcode is the wrong instrument for external buyers (unrevokable per-person, no identity, no
  contact capture).
- If a viewer has no stashed passcode, `useItemsDoc` soft-fails (401 → null) and proposal-view
  renders catalog.json fallback names — this degrade path is deliberate and must be preserved.

## Design sketch (v1)

1. **Pre-authorization:** proposal-builder gets an "authorized emails" field per proposal
   (one or more buyer emails). Stored with the proposal record.
2. **Buyer gate:** opening a proposal link shows an email-entry screen instead of the passcode
   gate (proposal routes only — everything else keeps the passcode gate). Email matches the
   pre-authorized list → access. Optionally a per-proposal short code in the emailed link
   (`?p=<proposal>&t=<token>`) so a forwarded bare URL alone isn't enough.
3. **Contact capture:** every successful (and failed) gate entry is logged — email, proposal id,
   timestamp — via the existing `logWrite()`/Blobs pattern. This is the lead-capture value:
   who opened what, when. Surfaced later in CRM; eventual HubSpot write-back is the existing
   "step 2" in INTEGRATION_WIRING_BRIEF.
4. **Server-side:** a `requireBuyerAuth(event, proposalId)` sibling to requireRead/WriteAuth —
   validates email/token against the proposal's authorized list. Proposal-data reads accept
   buyer auth OR portal passcode; tenant-wide endpoints (items-get etc.) stay passcode-only —
   buyer sessions get the catalog-fallback degrade, which already works.
5. **Automated proposals** (Rick's phrase "automated proposals"): once the gate exists, the
   Content Engine / Opportunity Engine flow (signal → draft → proposal) can email a proposal
   directly to a pre-authorized buyer with no human passcode-sharing step — the gate makes
   unattended sends safe.

## Non-goals (v1)

- No per-buyer accounts/passwords (that's the Clerk migration, separate track).
- No self-serve signup — pre-authorization is by the rep/admin, mirroring the existing
  manual access-request model.
- No change to internal (rep/admin) proposal-builder auth.

## Open questions for build time

- Token in link vs. email-entry only (or both, belt-and-suspenders)?
- Does buyer identity unlock exactly one proposal or all proposals addressed to that email?
- Retention/consent wording on the capture screen (it's lead data).
