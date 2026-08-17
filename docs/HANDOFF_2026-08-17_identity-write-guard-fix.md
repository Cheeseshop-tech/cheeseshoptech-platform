# HANDOFF — real Identity is live, but write/read functions still only trust the old passcode (fix in progress)

**Status: IN PROGRESS, not yet deployed or verified live.** Started 2026-08-17 evening, same session
that closed out the Security & Auth thread (deleting the passcode env vars, discovering they lived
at the Netlify team level — see `docs/BUILD_LOG.md` top entry and `CLAUDE_CODE_BRIEF.md` #8).

## The problem, precisely

The portal now genuinely signs users in with Netlify Identity (real email+password). But every
Netlify Function that reads or writes tenant data was built to trust ONE thing only: an
`x-portal-passcode` header, checked in `netlify/functions/_write-guard.js`
(`requireWriteAuth`/`requireReadAuth`) against `PORTAL_HOUSE_PASSCODE` / `PORTAL_ADMIN_PASSCODE` /
`PORTAL_ADMIN_PASSCODE_<TENANT>` / `PORTAL_PASSCODE`. The client only ever sent that header via
`writeAuthHeader()` in `src/lib/auth-context.jsx`, and only when `VITE_AUTH_MODE === "passcode"`.

Now that passcode mode is off and those passcode env vars are deleted (today's earlier fix), a
logged-in Identity session sends NO credential these functions recognize. Every one of them 401s.
That's ~19 functions — effectively everything except the login screen itself: Media Hub, Items,
CRM snapshot, Login log, Inventory, History, Campaigns, Quotes, Presentations/content library.

**Live proof, captured before this fix started:** the Agency Console's own "Integration health"
panel (`src/components/home/agency-console.jsx`) showed `HubSpot CRM (read-only): RE-ENTER
PASSCODE` — a stale message, since there is no passcode left to re-enter. That 401 is the same
401 every write/read call will now get.

## The precedent this fix follows

This exact problem was already solved once, narrowly, for card scanning
(`netlify/functions/card-ocr.js` + `src/lib/card-scan.js`, dated in-code to around 2026-08-07).
Pattern:

- **Server:** `context.clientContext.user` is populated automatically by Netlify when the request
  carries a valid Identity JWT as `Authorization: Bearer <token>` — Netlify verifies the signature
  server-side, we never see or check the secret ourselves.
- **Client:** send BOTH credentials the session might hold — `identityAuthHeader()` (in
  `src/lib/auth.js`, already existed, returns `{ Authorization: "Bearer <jwt>" }` or `{}`) and the
  legacy passcode header — so either auth system works and neither is a silent dead end.

`identityAuthHeader()` existed but was otherwise unused anywhere except `card-scan.js`. This fix
finishes wiring it everywhere else.

## What's been done so far (this session)

1. **`src/lib/auth-context.jsx`** — added a new exported async helper:

   ```js
   export async function authHeaders() {
     return { ...writeAuthHeader(), ...(await identityAuthHeader()) };
   }
   ```

   Additive only — `writeAuthHeader()` itself is untouched, so nothing currently working changes
   yet. `identityAuthHeader` imported from `./auth.js`.

That's the only edit landed as of this handoff. Everything below is still to do.

## What's left — server side

`netlify/functions/_write-guard.js` needs `requireWriteAuth`/`requireReadAuth` extended to accept
an optional `context` argument and check `context?.clientContext?.user` FIRST, deriving a role from
`user.app_metadata.roles` (mirrors `src/lib/auth.js`'s `rolesOf`/`tenantOf`/`canAccessTenant`, but
re-implemented standalone since these are server-side files and can't import the browser GoTrue
client). Unlike `card-ocr.js`'s simpler "any logged-in user passes" check, writes need role +
tenant enforcement:

- `owner`/`admin` role → `{ ok: true, role: "admin" }`, tenant-agnostic.
- `client-admin` role AND (no tenant arg, or user's tenant matches) → `{ ok: true, role:
  "client-admin" }` for read; write should stay admin/client-admin only, same as today.
- `client` role AND tenant matches → read-only `{ ok: true, role: "client" }` (reads only, mirrors
  today's `requireReadAuth` passcode tiers).
- Logged in but role/tenant doesn't clear the bar → `403`, not `401` (they're authenticated, just
  not authorized — clearer signal than "missing credential").
- No `context.clientContext.user` at all → fall through to the existing passcode check, unchanged
  (harmless no-op now that the passcode vars are deleted, but keeps the code path intact rather
  than ripping it out).

Then every function file that calls `requireWriteAuth`/`requireReadAuth` needs two small edits:
accept `context` as the handler's second parameter (most currently only declare `event`), and pass
`context` through to the guard call. Full list (19 files, `card-ocr.js` excluded — already fixed):

```
netlify/functions/login-log.js
netlify/functions/items-save.js
netlify/functions/ai-compose.js
netlify/functions/crm-summary.js
netlify/functions/crm-outreach.js
netlify/functions/crm-push.js
netlify/functions/quotes.js
netlify/functions/crm-hubspot.js
netlify/functions/inventory.js
netlify/functions/campaign-content.js
netlify/functions/history.js
netlify/functions/content-library.js
netlify/functions/campaign-enrichment.js
netlify/functions/media-list.js
netlify/functions/media-update.js
netlify/functions/items-get.js
netlify/functions/media-delete.js
netlify/functions/write-log.js
netlify/functions/campaign-state.js
```

## What's left — client side

Every one of these files imports `writeAuthHeader` from `auth-context.jsx` and spreads it directly
into a fetch's `headers`. Each needs the import changed to (also) pull `authHeaders`, and each
`...writeAuthHeader()` call site changed to `...(await authHeaders())` (all call sites checked —
every one is already inside an `async function` or an async arrow, so this is a mechanical swap,
EXCEPT the three noted below which need a small restructure since they're synchronous
fire-and-forget writes or non-async `useEffect` bodies):

```
src/lib/crm.js                        3 call sites, all async fns — straight swap
src/lib/campaigns.js                  6 call sites, all async fns — straight swap
src/lib/quotes-log.js                 loadQuoteLog: straight swap.
                                       appendQuoteLog: NOT async (fire-and-forget, returns
                                       synchronously) — wrap the fetch in
                                       authHeaders().then(headers => fetch(url, { headers: {...} }))
                                       instead of awaiting directly.
src/lib/booth.js                      1 call site, async fn — straight swap
src/lib/media.js                      4 call sites, all async fns — straight swap
src/lib/presentations-store.js        2 call sites, both async — straight swap
src/lib/history.js                    loadHistory: straight swap.
                                       appendHistory: same non-async restructure as appendQuoteLog.
src/lib/items.js                      2 call sites, both async — straight swap
src/lib/pricing.js                    1 call site, async — straight swap
src/components/home/agency-console.jsx
                                       3 call sites:
                                       - LoginLogPanel's useEffect (line ~59): fetch is inside a
                                         non-async useEffect body using .then() chains — restructure
                                         to authHeaders().then(headers => fetch(url, { headers })).then(...)
                                       - CrmSnapshotPanel's useEffect (line ~204): same restructure.
                                       - IntegrationPanel's pingCrm() (line ~343): already
                                         `async function pingCrm()` — straight swap.
src/components/presentations/slide-studio.jsx
                                       1 call site, inside async aiPolish() — straight swap
```

After all client + server edits: grep the whole repo for `writeAuthHeader()` used directly in a
`headers:` spread — should return zero results outside `auth-context.jsx` itself (where it's still
defined, just no longer called directly at fetch call sites) and outside the intentional passcode
fallback inside `authHeaders()`.

## Testing plan once code changes are complete

1. `node --check` every edited `.js`/`.jsx` file before considering it done (same discipline as the
   2026-08-14 Sentry wiring — 25+ files edited mechanically, verified this way).
2. **Cannot deploy/test without Rick.** Changes need a real Netlify deploy (Rick runs the COMMIT
   script; Netlify auto-builds on push) — this sandbox has no way to preview a live build.
3. Live-verify via Claude-in-Chrome against the real deployed app, NOT just the dashboard or code
   reading (per guardrail #8 — dashboard/code review already produced one wrong "Identity has been
   live since June" conclusion this project; don't repeat that pattern here):
   - Rick logs in for real at `admin.cheeseshoptech.com` (blocked as of this handoff on his own
     password reset — see below).
   - Agency Console → Integration Health panel → "HubSpot CRM (read-only)" → Test button. Should
     read live counts, not "re-enter passcode".
   - Try an actual write: edit/save something in Media Hub or Items. Should succeed, not 401.
   - Check `netlify/functions` logs (or the Sentry dashboard once wired) for any unexpected 403s
     from the new role/tenant enforcement — a real user landing in the wrong tenant would show up
     here.

## Blocking item, not code-related

Rick's own real Identity account (`Rick.posada@outlook.com`, `admin`/`owner` roles, created Jun 6)
has never had a password confirmed for it — passcode mode was the only thing actually used for two
months, so nobody ever completed the invite/set-password flow for this account. A password-reset
email was requested via Netlify's Identity → user → "Send reset password email" button (Rick's own
click, not Claude's — standing rule: Claude never touches Netlify Identity/security settings even
with permission). Login not yet confirmed as of this handoff. The code fix above can proceed and be
reviewed without this, but LIVE testing is blocked on it.

## Standing constraints (unchanged, reconfirmed this session)

- Claude never enters credentials or clicks Netlify security settings (env var edits/deletes,
  Identity role edits, user invites, password resets) — always exact manual steps for Rick to
  click himself.
- Git commits happen via `COMMIT *.command` scripts Rick double-clicks himself, never pushed
  directly from the sandbox.
- Verify live behavior, not just dashboard/code state, before calling anything "done" — the
  team-level env var miss earlier today is the cautionary example.

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
