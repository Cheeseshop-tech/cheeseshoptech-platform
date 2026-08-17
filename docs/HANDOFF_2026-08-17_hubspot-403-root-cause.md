# HANDOFF — the booth→HubSpot 403, root-caused

**Date:** 2026-08-17 · Supersedes §4.1 of `HANDOFF_2026-08-16_crm-hubspot-close-out.md`, which is WRONG.

## TL;DR
The 403 is a real `MISSING_SCOPES`. But adding scopes will never fix it, because
**`HUBSPOT_TOKEN` does not belong to either private app in the portal.**
Both existing apps already carry the write scopes. The token in Netlify is from a third,
unlisted app that has read scopes but not write.

**Fix: replace the value of `HUBSPOT_TOKEN` in Netlify with the **CheeseShop TECH** app's
token (`pat-na2-eab5f…`).** No code change, no redeploy — the token is read per-request.

## Evidence (all captured live, 2026-08-17)

Raw response body from a real commit, captured by wrapping `window.fetch` in the booth tool:

```json
{"error":"This app hasn't been granted all required scopes to make this call.",
 "requiredScopes":null,"category":"MISSING_SCOPES",
 "failedOn":"/crm/v3/objects/contacts/504097748710","phase":"commit"}
```

Portal 246062426 has exactly TWO private apps (Settings→Integrations→Private Apps no longer
exists; they are now under **Legacy Apps**, `/legacy-apps/246062426`):

| App | id | Token prefix | contacts.write | companies.write | API calls logged |
|---|---|---|---|---|---|
| Timely-Needle | 41408674 | `pat-na2-eb78c` | ✅ | ✅ | none |
| CheeseShop TECH *(renamed 2026-08-17 from "CheeseShop TECH-read-only")* | 44465792 | `pat-na2-eab5f` | ✅ | ✅ | none |

Neither is the `pat-na2-2aed1d25` fingerprint recorded in the 2026-08-16 handoff, neither shows
ANY logged API calls, and neither has had an error in 7 days — yet production reads work and
production writes 403. Therefore production is authenticating as a third credential.

`Timely-Needle` is unrelated to CST ("project dashboard and time management app").

## Why this went in circles for two sessions
1. `crm-push.js` appends *"Add the scope on the SAME private app…"* to **every** 403,
   unconditionally — the app diagnosed itself and the handoff recorded the guess as fact.
2. `booth-tool.jsx` renders only `res.hint` and `res.requiredScopes`. It **drops `res.error`
   and `res.category`**, which `crm-push.js` returns and `booth.js` passes through via `...data`.
   HubSpot's own sentence never once reached the screen.

## Actions
- [ ] **Rick:** Netlify → cheeseshoptech-platform → Configuration → Environment variables →
      `HUBSPOT_TOKEN` → paste the **CheeseShop TECH** app token. Re-run Sync.
- [x] **Rick:** renamed the app `CheeseShop TECH-read-only` → **CheeseShop TECH** (2026-08-17). The old
      name claimed read-only while the app held write scopes. Renaming does not rotate the token.
- [ ] **Code:** surface `res.category` + `res.error` in `booth-tool.jsx`'s failure branch.
      Without this the next failure is equally undiagnosable.
- [ ] **Security:** identify the third credential. Something outside these two apps has read
      access to the whole CRM and nobody knows what it is. Once `HUBSPOT_TOKEN` is swapped,
      the old one should be found and revoked.

## Method note
A dry run cannot prove write permission (it only searches). The reproduction used a throwaway
capture on `rick.posada@gmail.com` (already internal test data), which resolved to an existing
contact and took the same PATCH path. Nothing was written; the capture was deleted afterwards.

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
