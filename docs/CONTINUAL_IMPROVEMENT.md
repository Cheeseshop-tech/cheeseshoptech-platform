# Continual Improvement — how we evolve the tools

Status: 2026-06-18 · Owner: Rick Posada. Now that the team is testing on **live data**, improvement is
a steady loop, not a big-bang. This doc defines that loop and where it lives (one mind / one body).

## The loop
1. **Capture** — anyone hits friction or has an idea → it goes into `docs/BACKLOG.md` (the single list),
   or is told to Claude in a session and Claude files it there. Nothing lives only in someone's head or a chat.
2. **Triage (weekly)** — score each item by *impact* (does it move product / protect price / save time)
   and *effort*; pick the next small batch. Anything blocked on an outside party (e.g., the client's margins)
   is parked under **Blocked** with the blocker named.
3. **Build (small, safe)** — one batch at a time. Safety rules below. Prefer additive, flag-gated changes.
4. **Verify** — `npm run build` green; logic spot-checked; for data, the validation gate + a real read-back.
5. **Ship** — commit, then deploy (push). Data updates need no deploy; code changes do.
6. **Review** — confirm it landed, capture what the team says, feed it back to step 1.

## One mind / one body (where things live)
- **Backlog (the to-do brain):** `docs/BACKLOG.md` — the one source of truth for what's next. No side lists.
- **Why the tool works the way it does:** `docs/QUOTING_TOOL_PRINCIPLES.md`.
- **Data ownership:** per the map in QUOTING_TOOL_PRINCIPLES §9 (catalog = price; client.config = rules;
  live Blobs = inventory; commitments.json = commitments; **history store = quotes/movement, still to build**).
- **Data pipeline state:** `docs/DATA_UPDATES.md`.

## Safety rules (every change)
- Back up before structural changes (`archive/backup_YYYY-MM-DD_before_<change>/`).
- Build additively and, where possible, behind a flag (e.g., `VITE_PRICING_BACKEND`) so shipping is inert
  until switched on — test before replace.
- `npm run build` must be green; data changes pass the integrity gate (sync `--promote` + function 422).
- Commit small, with a clear message; deploy by pushing (`PUSH TO DEPLOY.command`). Roll back = one git revert.

## Cadence
- **Daily** — `monti-inventory-watch` keeps inventory live + integrity-checked (automatic).
- **Weekly** — improvement review: compile the week's stock movement + shelf-life at-risk + open backlog,
  and decide the next batch. (Scheduled task "weekly-improvement-review".)

## How to add an item
Drop a line under the right section of `docs/BACKLOG.md`, or just tell Claude "add to the backlog: …".
Format: `- [impact/effort] short description — why it matters (blocker, if any)`.
