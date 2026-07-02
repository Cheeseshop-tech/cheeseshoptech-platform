# Domain consolidation — everything under cheeseshoptech.com, ONE site

**Status:** Runbook (2026-07-02). Code side is DONE (apex serves ComingSoon + Sign in from the
platform site). What remains is DNS/Netlify — **Rick's actions, ~10 minutes in two dashboards.**

## Why

Today two Netlify sites split the brand domain:

| Address | Served by | Problem |
|---|---|---|
| cheeseshoptech.com | **"cheeseshoptech"** (Netlify Drop, not git-connected) | edits = manual re-drop; /tools/* + /series/* are proxies; /login is a redirect hop |
| montitrentini.cheeseshoptech.com | **cheeseshoptech-platform** (git-connected) | fine |

After the flip, **one git-connected site serves everything**: apex coming-soon + Sign in, house
app, every client subdomain, and /tools/* + /series/* natively (no proxies, no re-drops). One
point of reference: `cheeseshoptech.com`.

## Steps (in order)

1. **Netlify → cheeseshoptech-platform → Domain management → Add domain alias:**
   `cheeseshoptech.com` (and `www.cheeseshoptech.com` if you want www). Netlify will wait on DNS.
2. **Cloudflare → cheeseshoptech.com → DNS:**
   - Apex record (`@`): point to `cheeseshoptech-platform.netlify.app` (CNAME/flattened — same
     pattern as the montitrentini record), **DNS-only** (grey cloud), replacing whatever points at
     the Drop site today.
   - `www`: CNAME → `cheeseshoptech-platform.netlify.app`, DNS-only (optional).
   - Leave `montitrentini` and the reserved staff subdomains (`admin`/`app`/`console` if added)
     as they are.
   - The proxied wildcard `*.cheeseshoptech.com` → coming-soon: now redundant — retarget it to
     the platform site too (unknown subdomains will resolve to the house tenant lookup) or delete.
3. **Netlify:** confirm the alias verifies + SSL cert issues (Full-strict stays fine).
4. **Verify:** `cheeseshoptech.com` → coming-soon page **with Sign in** (bottom) → passcode gate →
   Command Center. `cheeseshoptech.com/tools/brand-systems-engine/` and `/series/queso-couture/`
   load natively (check the new `< Back` lines). `montitrentini.cheeseshoptech.com` unchanged.
5. **Retire the Drop site** ("cheeseshoptech" Netlify project): once 1–4 check out, delete it or
   just leave it unlinked — nothing points at it anymore. Its `public/coming-soon/` folder in this
   repo stays as history; the `/login` 302 and `_redirects` proxies are obsolete (the platform
   serves those paths itself).

## What changes for the workflow

- Coming-soon page edits = normal commits (it's `src/components/marketing/coming-soon.jsx` now).
  **No more Netlify Drop re-drops.**
- The BSE/QC pages keep deploying via git as before (`public/tools/…`, `public/series/…`).
- The invite-only **LandingPage v1 is kept** (`marketing/landing-page.jsx`) — at real launch, swap
  the apex render back in `App.jsx` (one line, marked with a comment).

## Gotchas

- `VITE_*` env vars and passcodes are already on the platform site/team — nothing to move.
- If apex flattening misbehaves on Cloudflare, use their CNAME-flattening `@` record (they do this
  automatically for apex CNAMEs).
- **BSE is still ungated** — consolidation makes it slightly more discoverable (same-site paths).
  Gate it soon (open item since 2026-07-01).
