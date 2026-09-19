# Weekly improvement review — Command Center auto-update wiring

**Status:** app side live-ready 2026-09-18 · **Read with:** `docs/CONTINUAL_IMPROVEMENT.md`, `docs/BACKLOG.md`
**Pattern:** identical to the market-news / inventory live-sync (routine → publish function → Netlify Blobs → app).

Rick, 2026-09-18: *"weekly improvement updates live in the command center as it is a CST build
operation reporting. automate this also. so it updates on its own."* Before this, the weekly
review only ever existed as a chat transcript from the `weekly-improvement-review` scheduled
task — useful once, invisible a week later. Now it also **updates the house Command Center
without an app rebuild**: the routine publishes the review into Netlify Blobs, and the Agency
Console's "Weekly improvement review" panel reads it on the next page load.

```
weekly-improvement-review (Cowork, weekly)
   │  reads docs/BACKLOG.md + docs/CONTINUAL_IMPROVEMENT.md, computes the shelf-life
   │  snapshot from src/data/montitrentini/inventory.json, checks git log
   │  writes src/data/cst/improvement-review.json
   ▼
scripts/publish-improvement-review.mjs
   │  POST + x-portal-passcode: AGENT_GATE_PASSCODE
   ▼
/.netlify/functions/improvement-review   → validates → Netlify Blobs ("improvement-review"/doc)
   ▼
Agency Console → "Weekly improvement review" panel (house admin only)
```

## Why this credential, not a new one

`_write-guard.js`'s `requireWriteAuth()` already accepts `AGENT_GATE_PASSCODE` (2026-09-17) —
the credential built specifically for "scripts/agents (no browser, no Identity session)". This
pipeline reuses it via the `x-portal-passcode` header (same as `reassign-asset-code.mjs` and
`validate-item-standards.mjs --live`) rather than inventing a fourth per-feature secret like
`INVENTORY_PUBLISH_SECRET` / `MARKETNEWS_PUBLISH_SECRET` predate it. One shared gate, one shared
credential, covering every unattended write on the platform.

## The contract the routine must satisfy

Write `src/data/cst/improvement-review.json` as a single object (not an array):

```jsonc
{
  "weekOf": "2026-09-18",                 // required, YYYY-MM-DD
  "shippedSummary": "…",                  // what shipped this week, 1–3 sentences
  "shelfLife": {
    "expired": 5, "urgent": 19, "watch": 32, "atRiskCases": 490,
    "topLots": [                          // up to 5, soonest-expiring first
      { "code": "20438", "name": "PROVOLONE CYLINDER CHEESE", "lot": "1206510", "exp": "2026-01-15", "cases": 38, "dleft": -246 }
    ]
  },
  "dataFreshnessNote": "…",                // e.g. "auto-sync failed validation, numbers are from the last promoted sync"
  "backlogNow": ["…"],                     // up to 10 lines, mirrors BACKLOG.md's Now section
  "backlogNext": ["…"],                    // up to 12 lines
  "recommendation": { "title": "…", "why": "…" },
  "blocked": [{ "item": "…", "blocker": "…" }],
  "openRisks": ["…"]                       // anything open and not yet on the backlog
}
```

`generatedAt` is stamped server-side by the function on every POST — never trust a
client-supplied timestamp for that field.

Publish step (from the repo root):

```bash
node scripts/publish-improvement-review.mjs
```

Exit codes: `0` published · `1` bad input/credentials · `2` publish rejected.

## Guardrails (deliberate — do not "fix" by loosening)

- **Server-side sanitization is authoritative.** `improvement-review.js` bounds every string
  length and array length and drops unknown keys — a malformed or oversized field is trimmed, not
  a reason to reject the whole document (a stale-but-present review is more useful than none).
- **`generatedAt` is always server time.** The routine may put whatever it wants there; it's
  overwritten on POST.
- **House admin only, both directions.** GET and POST both require `role === "admin"` — this is
  CST's own build-ops reporting, not a per-tenant client feature, same tier as `write-log.js` /
  `login-log.js`.
- **History is capped at 26 entries** (~6 months weekly) — bounded size, enough trend to be useful.
- **Blobs unreachable degrades to empty, never an error page.** The panel shows "no review
  published yet" rather than breaking the rest of the Agency Console.

## One-time setup (Rick)

1. Confirm `AGENT_GATE_PASSCODE` is already set in Netlify's env vars (it should be — this is the
   same credential `VALIDATE ITEMS LIVE.command` and `REASSIGN ASSET CODE.command` already use).
2. **Local creds for the routine** — create `scripts/.improvement-review-publish.json`
   (gitignored, mirrors `scripts/.inventory-publish.json` / `scripts/.market-news-publish.json`):
   ```json
   { "url": "https://cheeseshoptech-platform.netlify.app/.netlify/functions/improvement-review",
     "secret": "<the AGENT_GATE_PASSCODE value>" }
   ```
   This lets the unattended weekly run authenticate without the secret ever appearing in the
   scheduled-task prompt or this repo's tracked files.
3. Update the `weekly-improvement-review` scheduled task (already exists, runs weekly per
   `docs/CONTINUAL_IMPROVEMENT.md`'s cadence) so its last step writes
   `src/data/cst/improvement-review.json` per the contract above, then runs
   `node scripts/publish-improvement-review.mjs`. If step 2 hasn't been done yet, the publish
   step fails loudly (exit 1) and the routine should say so in its chat report rather than
   silently skipping it.

Until step 2 is done, the Command Center panel correctly shows "No review published yet" — that
message is computed per fetch, so it tells the truth about whether a review has actually
published rather than about a build flag.

## Verifying it ran

- **In the app:** Agency Console → "Weekly improvement review" shows this week's date and numbers
  instead of the empty state.
- **From a terminal:**
  ```bash
  curl -s -H "x-portal-passcode: $AGENT_GATE_PASSCODE" \
    "https://cheeseshoptech-platform.netlify.app/.netlify/functions/improvement-review"
  ```
