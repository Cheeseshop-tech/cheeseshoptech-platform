# CheeseShop TECH — Best-Practices Manual

**Status:** living doc · **Owner:** Rick Posada · **Purpose:** keep work coherent as it moves
across **four Claude surfaces** (Chat · Cowork · Claude Code · Claude Design). The recurring
failure mode is *drift* — a surface re-derives state because the handoff rotted. This manual is
the cure: **checkpoints, handoffs, and a build log**, with one clear home for every kind of fact.

> Read order for any surface picking up the project: **CLAUDE_CODE_BRIEF.md → HANDOFF.md →
> docs/BUILD_LOG.md (top) → this manual.** If anything conflicts, the BRIEF wins; reconcile before building.

---

## 1. The canonical docs — one home for every fact

| Doc | Holds | Update cadence | Newest where |
|---|---|---|---|
| **`CLAUDE_CODE_BRIEF.md`** (root) | The re-anchor: canonical facts + hard guardrails. Wins all conflicts. | Rarely (when a guardrail/decision changes) | — |
| **`HANDOFF.md`** (root) | **Current state snapshot** — always reflects HEAD. "Where are we right now." | **End of every work session** | rewritten in place |
| **`docs/BUILD_LOG.md`** | Append-only **decision/action history** — what changed, why, what it unblocks. | **Every material change** | top |
| **`docs/BEST_PRACTICES.md`** (this) | **How we work** — surfaces, checkpoints, git discipline. | When the process changes | — |
| Domain docs (`DESIGN_SYSTEM`, `OPERATIONS_MANUAL`, `AUTH_AND_ROLES`, `MEDIA_HUB`, `CRM_CONNECTOR`, `STOREFRONT_STRATEGY`, `PRICING_AND_ENGAGEMENT_MODEL`, `POSITIONING`, `LAUNCH_AND_MAINTENANCE`) | Deep detail per area — the single source of truth for that domain. | When that domain changes | — |
| `docs/archive/` | Superseded one-off handoffs, kept for history. | — | — |

**Rule:** a fact lives in exactly one doc. If you're tempted to write it twice, link instead.

---

## 2. The four Claude surfaces — what each is for (tool routing)

| Surface | Strengths | Use it for | Don't |
|---|---|---|---|
| **Chat** | Fast thinking, research, planning, Q&A. No repo write. | Strategy, research, drafting copy/specs, deciding *what* to build. | Treat its output as done until captured in a doc/commit. |
| **Cowork** | File access + orchestration, but **sandboxed git** (stale locks, no creds). | Reading the repo, writing briefs/handoffs, planning multi-step work. | **Don't run git here** (push/commit) — hand to Claude Code. |
| **Claude Code** | Real git, build, deploy, full toolchain. | **All building**: edits, `npm run build`, commits, pushes, deploys, verification. | Re-derive state — read the canonical docs first. |
| **Claude Design** | Visual/design craft. | Design passes, component/visual work, brand. | Fork per-client visuals (tokens + content only). |

**Routing heuristic:** *decide* in Chat → *plan/brief* in Cowork → *build + ship* in Claude Code →
*polish visuals* in Claude Design. Whoever finishes a leg writes the handoff for the next.

---

## 3. The checkpoint ritual (do this at every handoff / session end)

A "checkpoint" = a clean, captured stopping point another surface can resume from cold. Four steps:

1. **Build green** (in Claude Code): `npm run build` + `npm run validate:clients` pass.
2. **Commit + push** the work (see §4). One change = one commit.
3. **Append to `docs/BUILD_LOG.md`** — a dated entry: *what changed, why, what it unblocks* (newest on top).
4. **Rewrite `HANDOFF.md`** to the new current state, ending with a **"First message for the next surface"** re-anchor.

> If you only have 60 seconds: do #4. A correct HANDOFF.md beats everything.

---

## 4. Git & deploy discipline (the guardrails that prevent messes)

- **Canonical branch = `phase-2-6-build`** — it auto-deploys staging. `main` is the stale scaffold (leave it until launch).
- **One change = one commit.** Material decisions also get a BUILD_LOG entry.
- **Verify before deploy:** `npm run build` + `validate:clients` clean *before* pushing to the canonical branch.
- **Never fork per client.** Differentiation = `config/clients/<id>.json` (tokens + content) only. New visual patterns enter the **shared** system, documented in `DESIGN_SYSTEM.md` first.
- **Secrets are server-side only** (Netlify env / `netlify/functions/`). Never in the browser bundle or git. `.env` is gitignored. **Claude never enters credentials** — those are Rick's actions.
- **Git happens in Claude Code**, not Cowork (sandbox lock/cred issues). If a `.git/index.lock` blocks you: `rm -f .git/index.lock`.
- Commit messages end with the `Co-Authored-By` trailer; describe *what + why*, not just *what*.

### Build environment note
This machine has **no system Node**. To build/dev here, bootstrap once:
`curl -fsSL https://nodejs.org/dist/v22.18.0/node-v22.18.0-darwin-arm64.tar.gz | tar -xz -C /tmp`
then `export PATH="/tmp/node-v22.18.0-darwin-arm64/bin:$PATH"` and `npm install` once.
`npm run dev` enables a DEV-only admin auth bypass for local preview (production unaffected).
Verify a deploy by **grepping the staging bundle for a string unique to the latest commit** —
Netlify's content hash differs from local, so hash-matching is unreliable.

---

## 5. Templates

### HANDOFF.md skeleton (rewrite each session)
```
# HANDOFF — CheeseShop TECH platform
**Updated:** <date> · **HEAD:** <short-sha> "<commit subj>" · **Surface:** <Code/Cowork/…>

## Live now            — URLs, what's deployed, what's behind auth
## Where we are        — phase/module status (✅ / 🟡 / 🔴)
## In flight / not done — current task + exact next step
## Open threads         — flagged decisions, deferred work (link the owning doc)
## First message for the next surface
> <one paragraph: read X, the state is Y, do Z next>
```

### BUILD_LOG.md entry
```
## YYYY-MM-DD — <Title>
**Decision / Action.** <what changed>  **Why.** <reason>  **Status.** <verified? deployed?>
<what it unblocks / open follow-ups>
```

### Re-anchor "first message" for a fresh surface
> Read `CLAUDE_CODE_BRIEF.md` + `HANDOFF.md` + `docs/BUILD_LOG.md` (top). Confirm the canonical
> fact (platform = CheeseShop TECH; clients = tenants) and that `phase-2-6-build` is the source of
> truth. Then continue from "In flight" in HANDOFF — propose the plan before executing.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co. · keep this honest and current.*
