# HANDOFF — the booth→HubSpot 403, root-caused AND RESOLVED

**Status: RESOLVED 2026-08-17, verified live.** A real HubSpot write succeeded (contact
504097748710 updated, confirmed independently via the HubSpot MCP connection — not just a
200 from our own app). Booth captures now sync.

## What the "third credential" actually was
The "Security" action item below asked to hunt down an unidentified credential with CRM read
access. It's found, and it's not a leak: **`HUBSPOT_TOKEN` was pointing at a HubSpot Service
Key** (`CheeseShop TECH Platform`, id 42938322, `pat-na2-2aed1d25…`, created 2026-06-17) — a
credential system that lives under **Development → Keys → Service Keys**, completely separate
from **Legacy Apps / Private Apps** (`/legacy-apps/<portal>`), which is the only place this
investigation — and the original 2026-08-16 handoff — ever looked. Two credential systems, same
portal, nobody checked the second one. Rick found it by noticing the Service Keys list existed
at all.

**Fix applied:** swapped `HUBSPOT_TOKEN` in Netlify to the **CheeseShop TECH** Private App token
(`pat-na2-eab5f…`, id 44465792, confirmed write scopes) and **manually triggered a Netlify
deploy**. That second step mattered: pasting a new env var value does NOT trigger a build by
itself, and Netlify Functions bake env vars in at publish time — the earlier "no redeploy
needed" claim below (and in `CLAUDE_CODE_BRIEF.md`) is true of the CODE (`crm-push.js` does
read `process.env.HUBSPOT_TOKEN` fresh per invocation) but not of the PLATFORM. Confirmed via
the live bundle hash changing (`index-BbauN4dY.js` → `index-IkOuFDhR.js`) and the build log
showing `crm-push.js` re-bundled.

**Open decision, not urgent:** production now runs on the Private App token instead of the
Service Key it used since June. Two live "CheeseShop TECH"-named credentials now exist across
two different systems — pick one going forward (see options at the bottom) rather than leaving
both live indefinitely.

---

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
- [x] **Rick:** Netlify → cheeseshoptech-platform → Configuration → Environment variables →
      `HUBSPOT_TOKEN` → pasted the **CheeseShop TECH** Private App token. Then **manually
      triggered a deploy** (Deploys → Trigger deploy → Deploy site) — required, see above.
      Re-ran Sync: confirmed live write, verified via HubSpot MCP.
- [x] **Rick:** renamed the app `CheeseShop TECH-read-only` → **CheeseShop TECH** (2026-08-17). The old
      name claimed read-only while the app held write scopes. Renaming does not rotate the token.
- [x] **Code:** surfaced `res.category` + `res.error` in `booth-tool.jsx`'s failure branch
      (commit `56824be`, deployed). Confirmed live: a genuine 403 now shows HubSpot's verbatim
      message instead of the old hardcoded scope-guess sentence.
- [x] **Security:** identified. Not a leak — a legitimate Service Key (`CheeseShop TECH
      Platform`, id 42938322) that Rick created 2026-06-17 under a different HubSpot credential
      system than anyone thought to check. Nothing to revoke as a security incident.
- [ ] **Rick, not urgent:** decide whether to keep production on the Private App token going
      forward, or move it back to the Service Key with write scopes added there instead. Either
      is fine; leaving BOTH live under near-identical "CheeseShop TECH" names is the trap that
      caused this whole investigation and will confuse the next person just as easily.

## Method note
A dry run cannot prove write permission (it only searches). The reproduction used a throwaway
capture on `rick.posada@gmail.com` (already internal test data), which resolved to an existing
contact and took the same PATCH path. Nothing was written; the capture was deleted afterwards.

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
