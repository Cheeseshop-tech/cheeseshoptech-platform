# CheeseShop TECH — Project Roadmap & Daily Accountability

**Purpose:** Rick's own words (2026-08-17): "I constantly propose new ideas and projects with
little continuity." This doc is the fix — the single place every open thread lives, kept current,
that the daily email reads from and points back to. If it's not in here, it doesn't exist yet as
a tracked commitment.

**How to use this doc:** every thread below has a status (✅ Live / 🔧 In progress / 📋 Spec'd,
not built / 💭 Idea, not spec'd) and a **Next concrete action** — always something doable, not a
vague goal. The daily email pulls "Next concrete action" from whichever thread is flagged 🔴
PRIORITY. Update this file (not just BUILD_LOG.md) whenever a thread's status changes — that's
what keeps the email honest instead of stale.

**Last synced against repo:** 2026-08-17 (commit `74864cc`). Cross-referenced against
`CLAUDE_CODE_BRIEF.md` §3 (last updated 2026-06-06 — that file is stale by ~2.5 months of shipped
work; treat THIS doc as more current, and fix CLAUDE_CODE_BRIEF.md's state section in a future
session so it stops disagreeing with reality).

---

## Security & Auth upgrade

**Status:** ✅ Live — closed for real, 2026-08-17 late evening, after a mid-course correction
(see below for the full story of what was missed and how it was actually verified).

**CORRECTION, 2026-08-17 late evening:** everything below in this section describing Identity as
the live gate since June was based on an incomplete check. Netlify has TWO separate layers of
environment variables — project-level (`cheeseshoptech-platform` -> Environment variables, what
this whole thread checked all night) and a second, separate TEAM-level set (Team settings ->
Environment variables) that also applies to every build. The team-level set has its own
`PORTAL_PASSCODE` / `PORTAL_HOUSE_PASSCODE` / `PORTAL_ADMIN_PASSCODE`, and **`VITE_AUTH_MODE` set
to `passcode` there, last updated 2 months ago** — confirmed live by directly loading
`admin.cheeseshoptech.com` and seeing the real passcode screen, then confirming the value in
Netlify's team-level env vars page. `PasscodeGate` has been the actual live gate this whole time,
not `RequireAuth` — the opposite of what was concluded earlier tonight.

**What that means concretely:** the three passcode vars deleted from the PROJECT level tonight
were only shadow copies — the TEAM-level ones (the real, functioning ones) were never touched.
The house passcode originally given to Stefano on 8/13 may still work right now. All of tonight's
real Identity work (invite-only confirmed, ken.cha0528 removed, Stefano invited with role
client/tenant:montitrentini) is still real and still worth having, but it has not actually been
what's gating access.

**Next concrete action — the real remaining steps:**
1. At **Team settings -> Environment variables** (not the project page): delete `PORTAL_PASSCODE`,
   `PORTAL_HOUSE_PASSCODE`, `PORTAL_ADMIN_PASSCODE` there too.
2. Decide on `VITE_AUTH_MODE`: delete it (or set to `identity`) at the team level so `RequireAuth`
   actually becomes the live gate, making tonight's Identity work real instead of cosmetic.
3. Trigger a redeploy afterward (guardrail #7) and re-verify live on `admin.cheeseshoptech.com` —
   confirm it shows the real email+password screen, not the passcode screen, before calling this
   closed again.

**CLOSED FOR REAL, 2026-08-17 late evening.** Rick deleted `PORTAL_PASSCODE`,
`PORTAL_HOUSE_PASSCODE`, `PORTAL_ADMIN_PASSCODE`, and `VITE_AUTH_MODE` at the TEAM level (Team
settings -> Environment variables — took two passes since `VITE_AUTH_MODE` didn't take the first
time), redeployed each time, all from his phone. Verified LIVE, not just in the dashboard: loading
`admin.cheeseshoptech.com` fresh now shows the real "Sign in to your portal" email+password screen
(`RequireAuth`/`login-screen.jsx`), not the passcode screen — confirmed with a genuinely new JS
bundle hash each time, ruling out cache. `PasscodeGate` is no longer reachable in production.

This means real per-user Netlify Identity is now, for the first time, what's actually gating the
live app — everything from earlier tonight (invite-only registration, `ken.cha0528@gmail.com`
removed, Stefano invited with role `client/tenant:montitrentini`) is now the real, functioning
front door, not just correctly-configured-but-bypassed background setup. Thread genuinely done.

**Lesson learned, now in CLAUDE_CODE_BRIEF.md territory:** Netlify has two separate environment
variable layers — project-level and team-level (shared across every project) — and checking only
one is not enough. When verifying "is X set," check both, and when in doubt, verify against the
LIVE APP directly (not just the dashboard), since the dashboard can also show stale cached state
mid-session.

A full per-user login system (Netlify Identity — roles, tenant scoping, invite/recovery flows,
`src/lib/auth.js` + `auth-context.jsx` + `login-screen.jsx`) has existed in the codebase since
Phase 3 and has never been turned on for real use. Production currently runs on
`VITE_AUTH_MODE=passcode` — one shared password per tier (client / client-admin / house-admin),
no per-person accounts, no revocation if someone leaves. This already caused one real incident:
the house passcode was shared with Monti Trentini's GM on 2026-08-13/14 (not malicious, but it's
exactly the failure mode a shared secret can't prevent).

**Why this blocks client #2:** a second client sharing the same platform with only passcode-tier
auth means one client's admin passcode, if it ever leaked the way the house one did, has no
blast-radius containment. Real per-user accounts are the floor for "production-ready for more
than one trusting client."

**SUPERSEDED AGAIN, same day (this is now the third and current version of this thread's status —
see [[cst-auth-upgrade]] for the full chain).** Live-checked Netlify Identity directly: it is NOT
dormant. It has been the ACTIVE gate this whole time — `VITE_AUTH_MODE` was never set, so
`src/App.jsx` has been resolving to `RequireAuth` (real Identity), not `PasscodeGate`, all along.
Registration is already **Invite only** with **email confirmation required** — the secure baseline
is already in place. Three real accounts exist, all created 2026-06-06: Rick (`admin/owner`), a
`Richard`/`sales@montitrentini-usa.com` test account (`tenant:montitrentini`), and one unexplained
account — **`ken.cha0528@gmail.com`, role `admin`, origin unknown, not in any project doc or
memory.** All the `PORTAL_*` passcode env var work from earlier today is real and correctly built,
but currently inert — not what's actually gating the live app.

**2026-08-17, later same day: `ken.cha0528@gmail.com` removed from Identity.** Rick confirmed he
didn't recognize the account and deleted it via Identity → Users. Unexplained-admin item closed.

**2026-08-17, same evening — "logged in with the MT admin password, still had full CST admin
tools via the dropdown" report, investigated and closed, NOT a code bug:** Traced the actual
dropdown — it's the tenant switcher in `src/App.jsx` (~line 153), a `<select>` gated only by
`RoleGate roles={["admin"]}`, separate from which tenant/client URL is loaded. It renders for any
session with the `admin` role, by design ("CST staff can preview/switch tenants; clients can't" —
see `canAccessTenant()` in `src/lib/auth.js`). There is no passcode field anywhere on the live
login screen (`login-screen.jsx` is real email + password only — the `PasscodeGate` UI that reads
`PORTAL_ADMIN_PASSCODE_MONTITRENTINI` etc. is dead code in production, confirmed again). So
whatever Rick believed he entered as "the MT admin password," what actually granted access was his
own already-remembered `rick.posada@outlook.com` **owner** session — the same "logs in from
memory" browser session flagged earlier this session. An owner/admin session will always show the
tenant switcher and CST admin tools, regardless of which tenant's URL is open, because that's
exactly what an owner account is for. Confirmed no code or config fix needed here. Real fix is
testing method: before testing what a restricted user (Stefano, or an MT client-admin) would
actually see, Rick needs to fully sign out first — LogOut icon, top-right corner, next to the
tenant switcher — since a lingering owner session will out-rank any other input every time.

**CLOSED, 2026-08-17 evening.** Stefano invited to real Identity
(`stefano@montitrentini-usa.com`), accepted, and given role `client / tenant:montitrentini`
(confirmed on his Identity user page). Every item on this thread is now done:
1. ~~Rick identifies `ken.cha0528@gmail.com`~~ — done, removed.
2. ~~Invite Stefano, set role~~ — done, confirmed `client / tenant:montitrentini`.
3. `VITE_AUTH_MODE` left unset (keeps the app on real Identity) — already correct, untouched.
4. ~~Delete the three dead `PORTAL_*` passcode env vars~~ — done, redeployed, confirmed gone.

This whole thread — Security & Auth upgrade — is now **✅ Live**, not just spec'd. Move status
line at the top of this section to ✅ Live in the next full doc pass.

**VERIFIED END-TO-END, 2026-08-17 ~8:40pm.** Earlier the same evening a second gap was found and
fixed: every write/read Netlify Function trusted only the old passcode header, never real
Identity, so login worked but every data read/write still 401'd (see
docs/HANDOFF_2026-08-17_identity-write-guard-fix.md, commit `32a9da6`). That fix is now confirmed
genuinely working, not just deployed: Rick logged in for real, and the Agency Console's CRM
snapshot + Integration Health "HubSpot CRM" test both returned live data (826 contacts, 653
companies, 0 deals) using his real Identity session — no passcode involved anywhere. Stefano is
mid-password-reset as of this check, not yet confirmed logged in himself.

**Follow-on, same check:** the Integration Health panel's "Passcode gate" row was found showing a
permanent red false alarm (pings the now-retired `gate.js`, which will 500 forever since its env
vars are intentionally deleted). Fixed in code (renamed to "Auth (Identity)", checks Netlify's
public Identity settings endpoint instead) — commit ready in
`COMMIT FIX PASSCODE GATE FALSE ALARM.command`, not yet pushed as of this check.

**Resolved, 2026-08-17 evening — the 8/13 origin story, confirmed:** Rick confirmed the credential
he gave Stefano on 8/13 was the CheeseShop TECH house/admin **passcode** (`PORTAL_HOUSE_PASSCODE`),
never Rick's own real Netlify Identity email+password. Two things follow: (1) Rick's own real
account was never shared or at risk — confirmed it still logs him in fine, untouched by anything
today; (2) that shared passcode is now provably dead, since `PORTAL_HOUSE_PASSCODE` was one of the
three passcode variables deleted this evening (see above) — Stefano's old credential cannot work
again even if the passcode system were ever revived by mistake. Whether that passcode ever actually
functioned as a real login for Stefano back on 8/13 (given `PasscodeGate` appears to have been dead
code since June) is still an open historical question, but doesn't matter going forward — thread
closed either way. His real, working access is still the pending Identity invite below.

**Not in scope for this pass:** the Clerk migration (per-user + real multi-tenant orgs) that was
the original plan for "when client #2 signs." That's still the right long-term answer at 10-client
scale — Identity's tenant model is a role-string hack. Sequence: Identity now (closes the gap for
free), Clerk later (when scale actually demands it).

---

## Scale-to-10-clients infrastructure

**Status:** 🔧 In progress — real groundwork shipped, real gaps remain.

**Shipped:** template tenant (`config/clients/_template.json` = full clone config, content-free),
`demo` tenant renders every app's empty state, ~15-minute new-client stand-up procedure
(`docs/CLIENT_ONBOARDING_GUIDE.md` Step 0), onboarding kit (6 intake files, native formats), the
Onboarding Hub UI on the house Command Center.

**Real gaps:** `scripts/import-catalog.mjs` (data ingestion) not built — onboarding kit file 01
still needs Claude-assisted manual ingestion per client. Sales-history import is a documented gap
across two systems (agent A3/A4 forecasting AND Monti's own forecast). Pricing model itself
(`docs/PRICING_PROPOSAL_v1.1.md`) is proposed, not locked — Stand-Up Month + monthly tiers, needs
a "flinch test" before it's real. Agent economics (A1–A5) need Rick's Anthropic Console account +
spend cap set up before Stage 2 AI features unblock across the roster.

**Next concrete action:** decide and lock the pricing model (v1.1 proposal exists, needs a
yes/no/adjust), since that gates how "client #2" is actually proposed and signed at all.

---

## Ecommerce — D2C + Wholesale (the "jewel")

**Status:** 🔧 Foundations laid, most of the real build ahead. This is the single biggest body of
undone work on this list, and the one Rick flagged as most at risk of perpetual deferral — worth
protecting from getting bumped every time something more urgent shows up.

**D2C storefront (headless, Shopify-backed):** Decision locked 2026-06-06 — portal owns the
experience layer (frontend, merchandising, admin, analytics), Shopify owns checkout/payments/
tax/inventory (`docs/STOREFRONT_STRATEGY.md`). Product-catalog READ from Shopify's Storefront API
is built (`netlify/functions/store.js`) but has never run against a real store — Monti's current
Shopify presence is a static UI mock (`mt-e-comm`). Orders (Admin API) are deferred. Theme/hero/
banner/page management is portal-owned but still mock data.
**Next concrete action:** [Rick] confirm Monti has (or will have) a real Shopify store with
Storefront API enabled, then set `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_TOKEN` +
`VITE_STORE_BACKEND=shopify` in Netlify — that one step turns the mock into a live read.

**Wholesale ordering (portal-native, NOT ecomm):** Decision locked 2026-07-16 — wholesale pricing
and PO submission live inside the portal catalog, never in the ecomm platform, because wholesale
cheese pricing (catch weight, freight floors, class-of-trade margins, quote validity windows)
doesn't fit an ecommerce data model. 4-phase build plan (`docs/WHOLESALE_ORDERING_WORKFLOW_SPEC.md`):
Phase 1 (quote validity + price snapshot) — ✅ shipped 2026-07-16. Phase 2 (buyer email gate,
pre-authorized identity) — 📋 spec'd, not built. Phase 3 (customer pricing profiles + server-side
catalog price levels) — 💭 not started. Phase 4 (PO submission + pipeline stages) — 💭 not started.
**Next concrete action:** build Phase 2, the buyer email gate — it's the identity layer everything
after it depends on (`docs/PROPOSAL_BUYER_EMAIL_GATE_SPEC.md` already exists).

---

## Monti Trentini (client #1) — ongoing operations

**Status:** ✅ Live and actively used day-to-day; this is upkeep + incremental feature work, not
a green-field build. Booth→HubSpot CRM sync, Recap-to-Gmail, Pricing/Inventory sync, Content
Engine, Media Hub, Quote Builder, Asiago campaign tooling are all shipped and in real use.

**This week's fixes (2026-08-17):** booth→HubSpot 403 root-caused and resolved (wrong credential
type, not a missing scope — see [[hubspot-token-wrong-app]]); Recap button rebuilt to force Gmail
compose from the tenant's real sales identity instead of a bare, unreliable `mailto:` link, and
click-tested live.

**Open, not urgent:** decide whether `HUBSPOT_TOKEN` should move from the Private App token
(today's fix) onto a Service Key deliberately — HubSpot's own current guidance recommends Service
Keys for exactly this kind of data-only integration (see [[hubspot-token-wrong-app]] update).

---

## Also on the radar, not yet a tracked thread

- **CST business model crossroads** ([[cst-business-model-crossroads]]) — Stefano's interest in
  partnering in CST itself (not just being a client) is unresolved and higher-stakes than any
  item above; it changes the incentive structure around auth, IP, and pricing decisions once
  settled. Needs Rick's explicit decision, likely with legal counsel, before it's actionable here.
- **In-app Progress/Onboarding tab** — see `docs/PROGRESS_TAB_SPEC_2026-08-17.md`, spec'd
  2026-08-17, PROMOTED TO ACTIVE BUILD 2026-08-17 evening (Rick's call — see Daily Accountability
  section below). This roadmap doc is its data source once it exists.


---

## Daily accountability system (meta — how this doc itself gets used)

**Status:** 🔧 In progress. Built 2026-08-17: this doc as single source of truth + the visual
status page below. Blocked on one step only Rick can do.

**What exists:**
- This doc (`docs/PROJECT_ROADMAP.md`) — the source of truth every other piece reads from.
- A standalone visual status page (HTML, sent + persisted as a Cowork artifact 2026-08-17
  evening) rendering this doc's threads as cards with status badges, progress bars, and
  "Next concrete action" call-outs — the "visible map" Rick asked for, and a working preview of
  the in-app Progress tab below.
- `docs/PROGRESS_TAB_SPEC_2026-08-17.md` — spec for the in-app version.

**Decisions locked 2026-08-17 evening:**
1. Daily email send time: **7:00 AM local**, once the send account is connected.
2. Next active build thread (of Scale-to-10 / Ecommerce / Progress tab): **the in-app Progress /
   Onboarding tab** — see its own section above, now promoted from spec'd to active build.

**RESOLVED, 2026-08-17 ~9pm — different mechanism than planned, not the MCP connector.**
`hello@cheeseshoptech.com` turned out to be a Gmail account itself. Checked Anthropic's own docs:
Cowork currently supports only ONE connected Google account at a time (a known, open limitation —
see the GitHub feature request, closed as a duplicate). Connecting `hello@` as the MCP connector
would have silently dropped clean API access to Monti's `sales@` mailbox. Rick's call: don't touch
the connector. Instead, send via Claude-in-Chrome BROWSER AUTOMATION logged into
`hello@cheeseshoptech.com` in Rick's actual browser, on request.

**This changes the delivery model from automated-cron to Rick-prompted, on demand:**
- NO scheduled task (`create_trigger`) — deliberately not built. A 7am unattended cron can't
  reliably drive browser automation anyway (needs Rick's desktop app open + Chrome connected at
  that exact moment), so it would have silently failed some mornings — worse than not building it.
- Rick prompts a session himself whenever he wants an update (e.g. "send the project update" /
  "send today's status email"). Claude then drives Rick's own logged-in Gmail session
  (`hello@cheeseshoptech.com`) via browser automation to compose + send.
- The 7:00 AM send-time decision from earlier this evening is now moot (no cron to schedule it
  against) — kept here only as a historical note, not an active setting.
- Content: pulls from this doc + the `cst-project-status.html` status page (send that file, or its
  content inline, as the email body/attachment).
