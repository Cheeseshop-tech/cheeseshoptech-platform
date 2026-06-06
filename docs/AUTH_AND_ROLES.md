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
- `admin` — CheeseShop TECH staff. Tenant-agnostic: can view any tenant + the house/apex view, and sees the tenant switcher.
- `client` — the brand's own operators (full portal for their tenant).
- `pr` / `influencer` / `creator` — external collaborators; scoped to the media hub (approval states per `POSITIONING.md`). UI gated with `RoleGate`.

**Tenant scoping (DoD: no cross-tenant visibility).** `canAccessTenant(user, subdomain)`:
a non-admin may load a portal only if `app_metadata.tenant === subdomain`; mismatch → access denied.
Admins pass for any tenant.

## Rick's setup steps to go live

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
