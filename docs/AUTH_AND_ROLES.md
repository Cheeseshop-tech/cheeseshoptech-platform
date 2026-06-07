# CheeseShop TECH — Auth & Roles

**Status:** Phase 3 (built; needs Netlify-side enablement to go live) · **Last updated:** 2026-06-05

Auth runs on **Netlify Identity (GoTrue)**. Netlify confirmed on 2026-02-19 that Identity is
staying (the planned deprecation was reversed), so it's safe to build on. Login is a **custom,
house-branded screen** (not the Netlify widget) using `gotrue-js`, so it renders in the design
system and can be tenant-skinned.

## How it fits together

```
main.jsx → <AuthProvider> → <App> → <RequireAuth resolved>  → portal
                                     ├─ not signed in      → <LoginScreen>  (brand-skinned)
                                     ├─ wrong tenant       → access denied  (least privilege)
                                     └─ allowed            → <AppShell> portal
```

- `src/lib/auth.js` — GoTrue client + helpers (`login`, `logout`, `rolesOf`, `tenantOf`, `canAccessTenant`).
- `src/lib/auth-context.jsx` — React provider, `useAuth()` → `{ user, loading, error, login, logout }`.
- `src/components/auth/login-screen.jsx` — house/tenant-branded sign-in form.
- `src/components/auth/require-auth.jsx` — `RequireAuth` gate + `RoleGate` for in-page role gating.

## Roles & tenant model (lightweight, v1)

Per `POSITIONING.md`, target clients have ~2–3 operators — so we keep this light, not enterprise RBAC.
Two facts live in each user's **`app_metadata`** (server-controlled, NOT user-editable):

| Field | Example | Purpose |
|---|---|---|
| `app_metadata.roles` | `["client"]` | What the user can do. One or more of: `admin`, `client`, `pr`, `influencer`, `creator`. |
| `app_metadata.tenant` *or* a `tenant:<id>` role | `"montitrentini"` / `tenant:montitrentini` | Which tenant the user belongs to (matches the subdomain). Omit for `admin`. **The Netlify dashboard only edits roles**, so in practice assign a tenant by adding the role `tenant:montitrentini` alongside `client`. |

**Roles**
- `owner` — **Master Admin** (CheeseShop TECH ownership, Rick). Superset of `admin` (the app injects `admin` implicitly via `rolesOf`). Top of the hierarchy; reserved for platform ownership. Manage users/roles/resets from the Netlify Identity dashboard (passwords are never viewable — only invite / role change / send-reset / remove).
- `admin` — CheeseShop TECH staff. Tenant-agnostic: can view any tenant + the house/apex view, and sees the tenant switcher.
- `client` — the brand's own operators (full portal for their tenant).
- `pr` / `influencer` / `creator` — external collaborators; scoped to the media hub (approval states per `POSITIONING.md`). UI gated with `RoleGate`.

**Tenant scoping (DoD: no cross-tenant visibility).** `canAccessTenant(user, subdomain)`:
a non-admin may load a portal only if `app_metadata.tenant === subdomain`; mismatch → access denied.
Admins pass for any tenant.

## Pilot auth — shared passcode (active path, 2026-06-06)

**Decision (Rick): for the single-client pilot, skip per-user Identity and use one shared passcode.**
Per-user roles/tenant isolation only earn their keep once there are *two* clients to keep apart; we
move to **Clerk** (per-user accounts + roles + orgs=tenants) when client #2 signs.

**How it works.** `VITE_AUTH_MODE=passcode` swaps `RequireAuth` for `PasscodeGate`
(`src/components/auth/passcode-gate.jsx`). The gate POSTs the passcode to
`netlify/functions/gate.js`, which compares it to the server-side `PORTAL_PASSCODE` secret (never in
the bundle). On success the auth context grants a synthetic **`client`** session (no tenant switcher,
no house access); the tenant comes from the URL. Unlock persists in `localStorage`.

**To turn on [Rick] — two env vars + redeploy, that's it:**
1. Netlify → `cheeseshoptech-platform` → **Environment variables**: add
   `VITE_AUTH_MODE=passcode` and `PORTAL_PASSCODE=<a passcode you choose>`.
2. **Redeploy** (Deploys → Trigger deploy). Done — the portal now asks for the passcode.
3. Give Monti the URL (`…/?client=montitrentini`, or their subdomain once DNS is set) + the passcode.

**Limits (acceptable for a private pilot):** one shared passcode = everyone with it sees the same
portal; the unlock is a client-side flag after a server check (fine for a private B2B pilot, not for
public/consumer data). The `?app=1` house view is still reachable by someone who knows the trick —
Clerk closes these when we switch. Local dev: `npm run dev` has no functions server, so the gate
checks `VITE_PORTAL_PASSCODE` (default `monti`) client-side, DEV-only.

## Rick's setup steps to go live (per-user Identity — deferred in favor of the passcode pilot above)

1. **Enable Identity** on the Netlify site (Site config → Identity → Enable). Set registration to **Invite only**.
2. **Enforce strong passwords**; turn on 2FA where available.
3. **Invite a test user.** Set their **Roles** (Identity → the user → Edit settings → Roles):
   - Monti client: `client` **and** `tenant:montitrentini`
   - Yourself (CSTECH staff): `admin` (no tenant role needed)
   Invite/recovery links are handled by the app's custom flow (`SetPassword`) — clicking the email
   link lands on the site, where the user sets their password and is signed in.
4. **Deploy** the app (note: this replaces the coming-soon page — see HANDOFF deploy decision).
5. Verify: test user logs in over HTTPS, sees only their tenant; an admin can switch tenants.
6. **Quarterly:** review each client's user list (OM §10 least-privilege).

## Local dev note

Identity has no endpoint in local dev, so `AuthProvider` injects a mock **admin** user on
`npm run dev` (guarded by `import.meta.env.DEV` — it can never run in a production build).
To preview the real login screen locally, set `VITE_DEV_BYPASS_AUTH=false`.
To point local dev at a deployed Identity instance, set `VITE_GOTRUE_URL=https://<site>/.netlify/identity`.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
