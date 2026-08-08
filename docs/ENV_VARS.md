# Environment Variables — the inventory

**Single source of truth for every environment variable this app reads.** Created 2026-08-07
because the information existed only as scattered prose: `ANTHROPIC_API_KEY` was recorded as
live in one clause of BUILD_LOG.md line 437, while AI_TOOL_EMBED_SPEC.md still listed it under
"Prerequisites (Rick's to-do when resumed)" — two docs disagreeing, with the stale one easier to
find. Nothing anywhere listed the full set. That cost real time; this file is the fix.

**When you add a variable to the code, add a row here in the same commit.** A variable that
exists only in `process.env.X` and nobody's memory is a variable that gets re-created,
double-paid for, or silently missing after a site migration.

How-to (where to click, the rebuild gotcha, how to test):
`~/Documents/Claude/Playbooks/api-keys-and-env-vars/README.md`

---

## The prefix rule — read before adding anything

| Prefix | Where it ends up | Safe for secrets? |
|---|---|---|
| `VITE_…` | **Compiled into the browser bundle.** Anyone can read it in DevTools. | ❌ **Never** |
| no prefix | **Stays on the Netlify server**, readable only by functions. | ✅ Yes |

A secret that ever ships with a `VITE_` prefix is compromised — rotate it, don't just rename it.

---

## Server-side (secrets) — Netlify → Site configuration → Environment variables

These are read by `netlify/functions/*`. They never reach the browser.

| Variable | Purpose | Read by | Status |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API — business-card OCR + Content Engine AI Polish | `card-ocr.js`, `ai-compose.js` | ✅ **Live** (confirmed 2026-08-07). $25/mo cap set in the Anthropic console. |
| `ANTHROPIC_MODEL` | Overrides the Claude model | `card-ocr.js`, `ai-compose.js` | Optional — code defaults to `claude-sonnet-5` |
| `HUBSPOT_TOKEN` | HubSpot private-app token (CRM of record) | `crm-hubspot.js`, `crm-summary.js`, `crm-push.js` | Live — CRM reads work. Needs `crm.objects.contacts.write` for `crm-push`. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account | 6 media/items functions | Live — Media Hub works |
| `CLOUDINARY_API_KEY` | Cloudinary auth | 6 media/items functions | Live |
| `CLOUDINARY_API_SECRET` | Cloudinary auth | 6 media/items functions | Live |
| `PORTAL_HOUSE_PASSCODE` | House/admin sign-in; highest tier | `gate.js`, `_write-guard.js` | Live |
| `PORTAL_ADMIN_PASSCODE` | Generic client-admin tier (write access) | `gate.js`, `_write-guard.js` | Live |
| `PORTAL_ADMIN_PASSCODE_<TENANT>` | Per-tenant admin, e.g. `…_MONTITRENTINI` | `_write-guard.js` (derived) | Optional per tenant |
| `PORTAL_PASSCODE` | Base client tier — **read-only** | `gate.js`, `_write-guard.js` | Live |
| `SHOPIFY_STORE_DOMAIN` | Storefront domain | `store.js`, `store-orders.js` | Storefront tool |
| `SHOPIFY_STOREFRONT_TOKEN` | Public storefront API | `store.js` | Storefront tool |
| `SHOPIFY_ADMIN_TOKEN` | Admin API (orders) | `store-orders.js` | Storefront tool |
| `INVENTORY_PUBLISH_SECRET` | Guards the inventory publish endpoint | `inventory-publish.js` | Used by the sync script |
| `MAKE_CAMPAIGNS_WEBHOOK_URL` | Make webhook for campaigns | `campaigns.js` | Campaigns |

> **Status caveat:** "Live" for everything except `ANTHROPIC_API_KEY` is *inferred* from the
> corresponding feature working in production, not from reading the Netlify dashboard. Only the
> Anthropic key has been explicitly confirmed. Verify against the dashboard before relying on
> this column for a migration.

---

## Build-time (client) — compiled into the bundle, **public**

Set in Netlify build environment or `netlify.toml`. Changing any of these **requires a rebuild**.

| Variable | Purpose |
|---|---|
| `VITE_CLOUDINARY_CLOUD` | Cloudinary cloud name for client-side image URLs |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset — committed in `netlify.toml` by design (public, and shouldn't get lost) |
| `VITE_MEDIA_BACKEND` | `mock` \| `cloudinary` |
| `VITE_CRM_BACKEND` | `mock` \| `hubspot` — **`mock` is why local dev shows an empty account book** |
| `VITE_PRICING_BACKEND` | `function` = live Netlify Blobs store (see the inventory-sync note) |
| `VITE_IMAGES_BACKEND`, `VITE_STORE_BACKEND`, `VITE_CAMPAIGNS_BACKEND`, `VITE_SIGNALS_BACKEND`, `VITE_ATTENTION_BACKEND`, `VITE_MARKETNEWS_BACKEND` | Per-surface mock/live switches |
| `VITE_AUTH_MODE` | `passcode` selects `PasscodeGate` over Netlify Identity |
| `VITE_GOTRUE_URL` | Netlify Identity endpoint |
| `VITE_DEV_BYPASS_AUTH` | Local dev only — **must never be set in production** |
| `VITE_HOUSE_PASSCODE`, `VITE_PORTAL_ADMIN_PASSCODE`, `VITE_PORTAL_PASSCODE` | Client-side passcode gate values — see the warning below |

### ⚠️ The `VITE_*_PASSCODE` variables are not secrets

They are compiled into the bundle and readable by anyone who opens DevTools. That is **by design**
for the pilot: the client-side gate is a *soft* gate (keeps the portal out of casual view), and the
real enforcement is server-side — every function that writes calls `requireWriteAuth()` against the
un-prefixed `PORTAL_*` values, which never leave the server.

**The implication:** the `VITE_` passcodes control what the UI *shows*; the `PORTAL_*` passcodes
control what the server *allows*. Never assume the client-side pair protects data. If a real
secret ever needs client-side gating, that's a sign the check belongs in a function instead.

---

## Adding a new variable — the checklist

1. Decide the side: does a **function** need it (no prefix, secret) or the **browser** (`VITE_`, public)?
2. Add it in Netlify → Site configuration → Environment variables → All deploy contexts.
3. **Redeploy.** Env vars only take effect on the next build — this is the #1 gotcha.
4. **Add a row to this table** in the same commit as the code that reads it.
5. Verify with the diagnostic curl in the playbook.

## Related

- Playbook (click-by-click): `~/Documents/Claude/Playbooks/api-keys-and-env-vars/README.md`
- Deploy loop: `~/Documents/Claude/Playbooks/github-netlify-deploy/`
- Auth tiers: `docs/AUTH_AND_ROLES.md`
