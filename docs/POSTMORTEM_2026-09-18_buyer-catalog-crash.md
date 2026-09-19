# Postmortem — Buyer Catalog crash ("resolved is not defined")

**Date:** 2026-09-18 · **Severity:** SEV-2 (core buyer-facing page fully down, no data loss, no
workaround — the page itself was blank)
**Surface:** Product Catalog (`montitrentini.cheeseshoptech.com`) · **Client:** Monti Trentini
**Status:** Resolved and verified live. Duration of exposure: ~2h4m (introduced 15:17, fixed
17:21, both 2026-09-18).
**Authors:** Claude Code, from `docs/HANDOFF_2026-09-18_catalog-crash-and-spec-sheet-redirect.md`
and the commit history below. **Status:** Draft — Rick, check §5 and §6 before treating this as final.

---

## Summary

At 15:17, a commit whose message and stated purpose were entirely about drafting a client email
(`c9d4324`, "Draft the Monti spec sheet request…") also carried an undescribed drive-by fix to
`buyer-catalog.jsx`: a guard that hides any item code not on the live price list, closing a
separate bug (phantom item `04108` was visible to buyers). The guard's `useMemo` referenced
`resolved`, a variable that exists only in the parent component's props, not in the child
component (`BuyerCatalog`) it was written inside. JavaScript treats that as a free variable, which
throws `ReferenceError: resolved is not defined` at render time — not at build time — so
`vite build` stayed green and the bug shipped straight to production. Every visit to the Product
Catalog hit the top-level error boundary and saw "Something went wrong on this page." Discovered
when Rick opened the page, not by any automated system, at some point before 17:21. Fixed in
`a0615a8` by moving the `useMemo` into the parent component and passing the result down as a
prop, verified live (107 items rendering across all 8 category filters), and closed out in
`94c2276`.

## Impact

| | |
|---|---|
| Surface affected | Product Catalog only — the rest of the portal (Media Hub, CRM, pricing, campaigns) was unaffected |
| Users affected | Anyone opening the Product Catalog during the window — buyers and internal users both |
| Duration | ~2h4m (15:17 → 17:21), further bounded by whenever the deploy actually finished and whenever Rick actually opened the page — both narrower than the commit-to-commit window |
| Data at risk | None — this was a render-time crash, not a write path |
| Workaround during incident | None. The page had no fallback; it was blank for every visitor. |

## Timeline (2026-09-18, all times ET)

| Time | Event |
|---|---|
| 15:17 | `c9d4324` pushed. Message: drafting the Monti spec-sheet request. Also contains, unmentioned in the message, a fix for phantom item `04108` in `buyer-catalog.jsx` — a `realSkus` gate written inside the wrong component scope. |
| 15:17–~17:xx | Live. Every render of the Buyer Catalog throws `ReferenceError: resolved is not defined`; page shows the error boundary. Sentry's browser SDK is confirmed live in this exact production bundle (see §4), so the exception was very likely captured — but no alert notification exists, so nothing surfaced it. |
| ~17:xx | Rick opens the Product Catalog, sees "Something went wrong on this page," reports it. |
| 17:21 | `a0615a8` — root cause diagnosed and fixed: `useMemo` moved to `CatalogPage` (where `resolved` is actually in scope), `realSkus` passed down as a prop, `BuyerCatalog` defaults it to `new Set()` so a future omission degrades to "show everything" instead of throwing. |
| ~17:21+ | Verified live: catalog renders 107 items across all 8 category filters. |
| 17:25 | `94c2276` — handoff doc committed, incident closed out. |

## Root cause

`BuyerCatalog({ data, brandName, tenantId, itemsFolder })` takes flat props and never receives the
tenant object. `CatalogPage({ resolved })`, its parent, is the only place `resolved` is in scope.
The `04108` guard — a `useMemo` computing which SKUs are real, straight off the price list — was
written inside `BuyerCatalog` and referenced `resolved` anyway:

```js
const realSkus = useMemo(() => {
  const set = new Set();
  for (const p of getPricingData(resolved)?.catalog?.products || [])  // `resolved` not in scope here
    for (const s of p.skus || []) if (s.code) set.add(String(s.code));
  return set;
}, [resolved]);
```

A free variable reference is not a syntax error and not a type error a bundler can see — it only
throws when the line actually executes. `vite build` transforms and bundles the module
successfully either way, so the build stayed green and nothing in the pipeline objected.

**Contributing factor — no linter.** There was no ESLint (or any static analysis) anywhere in this
repo before today. `no-undef` — the single rule that catches exactly this class of bug, at lint
time, for free — did not exist to catch it.

**Contributing factor — the fix was invisible in its own commit.** The change that introduced the
bug was bundled inside a commit about an unrelated client-communication task, with no mention of
it in the commit message. A reviewer (human or automated) scanning commit history for
render-logic risk would not have found it without reading every file in every commit.

**Contributing factor — a safety guard failed closed.** The `04108` guard's entire purpose was to
protect buyers from seeing bad data. Its own bug took down the entire page instead of just
under-filtering. (Already addressed in the fix: `realSkus` now defaults to `new Set()` if omitted,
so a similar mistake in the future would show everything rather than throw.)

## Five whys

1. **Why did the Buyer Catalog go blank for ~2 hours?** Because `CatalogPage`/`BuyerCatalog`
   threw an uncaught `ReferenceError` on every render, which the top-level error boundary
   catches by replacing the whole page with "Something went wrong."
2. **Why did that `ReferenceError` happen?** Because a `useMemo` added to gate out phantom item
   codes referenced `resolved`, a variable that only exists in the parent component's scope —
   `BuyerCatalog` never receives it.
3. **Why did that scope mistake reach production instead of getting caught first?** Because
   nothing in the pipeline checks for undefined-variable references. `vite build` only catches
   syntax/import/type-adjacent errors; a free variable is invisible to it because it's only a
   runtime failure.
4. **Why was there nothing to catch it?** Because this repo has never had a linter. The only
   defense against this class of bug was a human reading the diff carefully enough to notice a
   variable that "looked right" (`resolved` is used constantly throughout this codebase) was
   actually out of scope in this one spot — and that diff was bundled inside a commit whose
   entire stated purpose was an unrelated client email, reducing the odds anyone's attention was
   on the catalog code at all.
5. **Why did it take ~2 hours for anyone to notice, rather than seconds?** Because the only
   detection mechanism was a human opening the page. Sentry's browser SDK is confirmed live in
   production (verified by inspecting the deployed bundle directly, §4) and almost certainly
   captured the exception — but there is no alert rule routing a new Sentry issue to anywhere
   Rick would see it, and this repo's own `docs/ENV_VARS.md` and `docs/BACKLOG.md` both
   incorrectly stated Sentry wasn't configured yet, which is exactly the kind of thing that talks
   a person out of checking it.

**Root cause, stated once:** a runtime-only scope bug shipped because no static check existed to
catch it, and the one system that *did* catch it at runtime (Sentry) had no path to a human,
compounded by this repo's own documentation asserting that system didn't exist.

## What went well

- The fix itself was fast and correct once found: diagnosed and shipped inside a ~17-minute
  window per the handoff doc.
- The fix didn't just patch the symptom — it also hardened the failure mode (`realSkus` now
  defaults safely instead of throwing on omission).
- Nothing else on the platform was affected; the blast radius stayed exactly to the one page.

## What went poorly

- No static check existed for the exact bug class that caused this.
- The introducing change was undocumented in its own commit message.
- Detection depended entirely on a human opening the page.
- Project documentation actively asserted that the one system capable of automated detection
  (Sentry) wasn't configured, when it was.

## Verified today, not assumed

Checked directly against the live production bundle at `montitrentini.cheeseshoptech.com`
(2026-09-18), rather than trusting docs or the handoff's assumption:

- `VITE_SENTRY_DSN` **is** set and baked into the deployed bundle (`o4512023279435776.ingest.us.sentry.io`).
  The Sentry SDK chunk loads unconditionally on every page load (`initMonitoring()` runs
  unconditionally from `main.jsx`, not lazily on error) — confirmed present in the live network
  payload. This means the browser-side monitoring half described in
  `docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md` has been live for some time, contrary to
  `docs/ENV_VARS.md` and `docs/BACKLOG.md`, both corrected today.
- `SENTRY_DSN` (the Netlify Functions half, `_sentry.js`) — **was set, but to a value that didn't
  match** the project's current DSN on Sentry's Client Keys page. This means the 25 Netlify
  Functions have been running `withMonitoring()` in a silently-broken state — not "unconfigured"
  (which no-ops cleanly) but pointed at the wrong place, so function-side errors and
  slow-response signals were not reaching Sentry, with no indication anything was wrong. A third
  contributing gap in the same monitoring system this incident already exposed. Rick edited the
  value in Netlify; a local test script (`_archive/one-time-scripts/test-sentry-functions-dsn.mjs`)
  then rejected the pasted value as "invalid DSN," and it's unclear whether what's saved now is
  the fix or a re-paste of the original — **not resolved**, dropped for now at Rick's call.
- No ESLint existed in this repo before today (`devDependencies` had none, no `.eslintrc*` /
  `eslint.config.js`, no `.github/workflows`). Confirmed by direct inspection, not inference.

## Action items

| Action | Owner | Priority | Status |
|---|---|---|---|
| Add a lint gate (`no-undef` + `react-hooks/rules-of-hooks`/`exhaustive-deps`) and wire it as a blocking `prebuild` step | Claude Code | P0 | **Done 2026-09-18** — `eslint.config.js` added; `npm run build` now runs it first; verified 0 errors / 24 pre-existing warnings on the current tree, so this deploy is not blocked |
| Correct the stale "Sentry not configured" claims in `ENV_VARS.md` and `BACKLOG.md` | Claude Code | P0 | **Done 2026-09-18** |
| Check the Sentry dashboard (sentry.io) for this crash and confirm what it recorded | Rick | P0 | **Done 2026-09-18** — `ReferenceError: resolved is not defined` was there, 13 events, first seen ~21:09 UTC, last seen ~21:23 UTC — 3 minutes before the `a0615a8` fix went live at 21:26:28 UTC, and nothing since. Confirms Sentry recorded it correctly and the fix fully stopped it. Marked Resolved in Sentry (along with an unrelated pre-existing `ReferenceError: Cannot access 'T' before initialization` from 2026-09-17, also resolved while there). |
| Add a Sentry alert rule (email/Slack) for new production issues | Rick | P0 | **Done 2026-09-18** — email notifications turned on for new issues |
| Confirm `SENTRY_DSN` (functions half) is actually set in Netlify | Rick | P1 | **Open, attempted** — found it was set to a value that didn't match the project's current DSN; Rick edited it, but a local format-check script then rejected the pasted value as "invalid DSN," and whether the currently-saved value is fixed or reverted is unclear. Dropped for now at Rick's call — functions read `process.env.SENTRY_DSN` at invocation time (not build time), so whenever it is actually corrected it takes effect without a redeploy. |
| Add a real post-deploy smoke check (a headless-browser hit against key routes, checking the error-boundary text is absent) rather than relying on `vite build` succeeding | Claude Code (proposed, not built) | P1 | **Open** — this needs a new dependency (e.g. Playwright) and a decision on where it runs; flagging rather than adding unasked |
| When a commit changes render/business logic, say so in the message even if bundled with unrelated work | Rick (process norm) | P2 | **Open** — no code change, just a habit |
| Audit `.command` buttons for the tee-to-`_archive/logs/` pattern the redirect button adopted today | Claude Code | P2 | **Partly done** — quick pass: of 8 root `.command` files, only today's `COMMIT HANDOFF DOC.command` tees to a log file; the rest (`DEPLOY TO STAGING`, `PUSH TO DEPLOY`, `REVIEW PORTAL`, `FIX GIT LOCK AND PUSH`, `VALIDATE ITEMS LIVE`, and the two spec-sheet commit buttons) print explicit error messages on each `git`/step failure but don't persist a log. Full remediation of all 7 needs its own pass — not done here to keep this session scoped to the crash. |

## Lessons learned

A build passing proves the code parses and bundles — it says nothing about whether it runs
correctly. The only two things that would have caught this before it reached buyers were a
five-minute lint rule (now added) or someone opening the page before calling it done (a standing
non-negotiable already written into the 2026-09-18 handoff doc). Both are cheap; neither existed
this morning. The Sentry documentation gap is the more interesting failure: an accurate "here's
what we don't have yet" list is only useful until it goes stale, and a stale one is actively worse
than no list at all, because it tells people not to check the one place that would have shortened
this incident from ~2 hours to minutes.
