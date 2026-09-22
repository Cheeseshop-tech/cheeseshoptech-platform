# Booth-to-Meeting: team sales record (spec v2 — supersedes v1 same day)

v1 (this morning) covered a durable, cross-device capture log. Rick's ask has grown: this is now
Phase 1 of a team sales management tool — individual rep attribution on every record, plus edit
rights. Everything from v1 still holds (Netlify Blobs store, fire-and-forget instant write,
offline retry sweep, `booth-history.js` cloned from the existing `history.js` pattern); this adds
identity and editing on top of it.

## What already exists (found while scoping this)

The portal already has a real, working per-user login system — Netlify Identity. `auth.js` /
`auth-context.jsx` support it fully, and `record-login.js` has been logging real Identity
sign-ins (name, email, roles, tenant) since Aug 17. **But the live pilot runs in a different mode**
(`VITE_AUTH_MODE=passcode`) — three *shared* tier passcodes (client / client-admin / admin), no
individual accounts. Every capture today is attributed to whichever shared passcode was used, not
a person — the "Rep" field on Territory is a free-text label, not a real login.

So the pieces for real per-user accounts aren't new — they're built and dormant. What's new is
turning that on and wiring the booth write-path to require it.

## Decisions from Rick (Sep 16)

- **Identity: full individual logins (Netlify Identity)**, not a lightweight name-picker.
- **Edit rights: the rep who captured a record, plus admins** (client-admin/admin tier) — not
  open peer-editing.

## Scoping question this raises (needs Rick's call before build)

Turning Identity ON for Booth-to-Meeting specifically vs. for the whole portal is a real fork:

- **Booth-only**: gate just the booth write-path (new `booth-history.js`, and optionally the
  existing `crm-push.js` HubSpot sync) on a real Identity JWT, while every other tool
  (Catalog, Price List, Media Hub, etc.) keeps working exactly as it does today on shared
  passcodes. Lower risk, no disruption to Stefano or anyone else's existing login habit,
  ships faster. Reps who need to use Booth to Meeting need Identity accounts created for them
  (via Netlify's Identity panel — no code needed for that part); everyone else is unaffected.
- **Portal-wide**: flip `VITE_AUTH_MODE` off passcode mode everywhere, so every tool requires a
  real account. This is the eventual shape of "team sales management tool" but it's a bigger
  cutover — everyone currently using a shared passcode (including any client-side users) needs a
  real account first, or they're locked out the moment it ships.

**Recommendation: booth-only for now.** It gets you individual attribution where you actually
need it today (the sales floor) without putting the rest of the live portal's login flow at risk.
Portal-wide Identity becomes a separate, later phase once Booth to Meeting has proven the pattern.
Flag if you'd rather do the full cutover now instead.

## Record shape (adds to v1)

```js
{
  // ...v1 fields (id, capturedAt, name, company, email, phone, contactRole, temperature,
  // nextStepMode, products, scopeId, pushedAt, tenant)
  capturedBy: { email, name },        // from the Identity JWT at capture time — not client-claimed
  editedBy: [{ email, name, at }],    // append-only edit trail, one entry per save
}
```

## Server-side (`netlify/functions/booth-history.js`)

- **POST (create)** requires a valid Identity JWT (`context.clientContext.user`) — same trust
  mechanism `record-login.js` already relies on: Netlify verifies the JWT before this code runs,
  so a client can't claim to be someone else. Stamps `capturedBy` from the verified user, ignoring
  anything the client sends for that field.
- **New: POST (edit)**, e.g. `{ tenant, id, patch, action: "update" }` — server checks the existing
  record's `capturedBy.email` against the requester's verified email; allows the edit if they
  match OR the requester's role is `client-admin`/`admin`. Appends to `editedBy`. Rejects
  (403) otherwise — this check has to live server-side, not just hide the button in the UI, the
  same lesson `_write-guard.js` already encodes for every other write endpoint.
- Everything else (dedup by id, cap at 5000/tenant, `logWrite` audit entry) unchanged from v1.

## Client (`booth-tool.jsx` / `booth.js`)

- History tab (v1) gains an **Edit** action per row, shown only when
  `currentUser.email === record.capturedBy.email` or the current role is admin/client-admin —
  UI-side check for a clean experience, backed by the server-side check above as the real gate.
- Edit opens a small form (name/company/phone/email/next step/notes) and saves via the new
  update path; the row then shows "edited by X" from the latest `editedBy` entry.
- Booth to Meeting's screens start showing the signed-in rep's name (from Identity) instead of a
  generic "Portal" label, once Identity is live for this tool.

## Sequencing

1. Confirm booth-only vs. portal-wide Identity scope (above).
2. Create Identity accounts for whoever's actually working booths (need the list of reps/emails).
3. Build `booth-history.js` (create + edit), wire the client, add the History tab with Edit.
4. Ship to a branch/deploy preview first for you to try before it touches `phase-2-6-build`.

## Still out of scope for Phase 1

Leaderboards/dashboards across reps, assigning accounts/territories as real data instead of the
free-text Rep field, notifications — reasonable Phase 2 candidates for "team sales management
tool" once individual attribution and edit rights are actually in use.

## Addendum v3 (2026-09-22): step 2 of Sequencing never happened, and it broke everything

This spec's own "Sequencing" section (above) had step 2 as "Create Identity accounts for whoever's
actually working booths (need the list of reps/emails)" — a real prerequisite, flagged at the
time. It was never done: no Identity accounts exist for anyone, and the live pilot has stayed on
`VITE_AUTH_MODE=passcode` the whole time (`src/App.jsx:42` routes the ENTIRE app through
`PasscodeGate` exclusively in that mode — `RequireAuth`/`LoginScreen`, the only UI that can ever
produce a real Identity JWT, is never rendered). So every capture since this shipped has hit the
"Identity JWT only" wall in `booth-history.js`'s create/edit — silently, since `pushToHistory()` is
deliberately fire-and-forget. Confirmed concretely: the live `booth-history` store held exactly 3
records (all from 8/8, apparently synced out-of-band), and a 9/15 Ace Endico capture that reached
HubSpot fine via `crm-push.js` (which does accept passcode auth) was completely absent from
History. Root-caused during an architecture review (`docs/ADR-001_booth-to-meeting-reliability_2026-09-22.md`)
after first suspecting mobile-specific session issues — those turned out to be a dead end; this is
a portal-wide configuration fact, not a device-specific one.

**Fix shipped:** `booth-history.js` create/edit now accept the same admin/client-admin passcode
tiers `requireWriteAuth()` already grants everywhere else in this app (`campaign-state.js`,
`crm-push.js`) — see the file's own header comment. A real Identity session, when one exists,
still wins and still attributes to that actual person; a passcode-tier write gets an honest
synthetic "who" (`passcodeWho()`) instead of a fabricated name, and per-record edit rights fall
back to privileged-role-only (no individual "did you capture this" check possible without a real
signed-in person). Also fixed in the same pass: `notes` was missing from both `toHistoryRecord()`
(booth.js) and `sanitizeNew()` (booth-history.js) since day one, so no capture ever carried its
note text into History until someone manually re-entered it via Edit. And `booth-tool.jsx` now
shows a visible "Not backed up" pill on any capture missing `historySyncedAt`, so the next time
sync genuinely fails (offline, a real outage) it's visible and actionable instead of silent.

**Not done:** portal-wide Identity is still not live, and creating real accounts for reps is still
worth doing eventually (this spec's original reasoning for wanting it — genuine per-person
attribution — hasn't changed) but is no longer a prerequisite for History to work at all.
