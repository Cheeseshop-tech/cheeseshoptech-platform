# Archive

## one-time-scripts/

Historical "double-click to commit + push" `.command` helper scripts. Each one committed a
specific piece of work at the time it was written; every one in here has already landed on
`phase-2-6-build` and been pushed. They're kept only as a record of what a given session did and
how — not meant to be re-run. Anything task-specific belongs here once it has done its job.

**The root-level `.command` scripts are the FIVE reusable ones, and only those:**

| Script | What it is for |
|---|---|
| `DEPLOY TO STAGING.command` | push committed work; Netlify auto-deploys `phase-2-6-build` |
| `PUSH TO DEPLOY.command` | the other push path |
| `REVIEW PORTAL.command` | start the local Vite dev server and open the Monti portal |
| `FIX GIT LOCK AND PUSH.command` | clear the stranded git locks this mount leaves behind |
| `VALIDATE ITEMS LIVE.command` | item-standards check against the LIVE Media Hub store |

`VALIDATE ITEMS LIVE` was added to this list 2026-09-26. It had been sitting in root looking like
a one-off, but it is not: the offline audit reads the repo's `items-seed.json` snapshot and cannot
see records that exist only in Media Hub — which is exactly how the phantom item `04108` stayed
invisible to every offline run on 2026-09-18. Only the live run gives a trustworthy answer, so
this one stays reachable.

**Housekeeping cadence.** Root drifts back toward clutter on its own: it hit ~148 scripts by
2026-09-03, was cleaned to 4, and was back to 34 by 2026-09-26 (29 archived that day). The rule
that keeps it down is: archive a task-specific script as soon as you have confirmed its commit
landed on origin — not "later."

## LEARNING_LOG.md

Stray file from a 2026-08-17 session that created it in the wrong place — the real learning log
lives in the separate `Claude best Practice manual` folder, not this repo. Kept here rather than
deleted in case anything in it is still useful; safe to delete for good whenever you get to it.
