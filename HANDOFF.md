# HANDOFF — CheeseShop TECH platform build

**Last updated:** 2026-06-05 · **Last chat:** scaffold + Phase 0 + Phase 1

## Where we are

- **Phase 0 — COMPLETE.** Repo `cheeseshoptech-platform` live & private at github.com/cheeseshop-tech. Accounts set up (Cloudflare, Netlify, GitHub, Cloudinary, Make, HubSpot). Netlify tier = PRO.
- **Phase 1 — COMPLETE.** `https://cheeseshoptech.com` live over HTTPS (coming-soon page). Option C wired: 3 proxied CNAMEs in Cloudflare (`@`, `www`, `*`) → `cheeseshoptech.netlify.app`. Wildcard routing verified — any client subdomain resolves with zero DNS work.

## Open / not blocking

- [ ] **Push latest docs** — Build Log + TASKS updates are saved locally but not yet pushed:
  `git add -A && git commit -m "Phase 1 complete" && git push` from this folder.
- [ ] **SSL hardening** — confirm Cloudflare SSL/TLS = Full (strict); optionally upload Origin Certificate. Site works today regardless.
- [ ] **Registrar auto-renew ON** for cheeseshoptech.com.

## Next: Phase 2 — Design system & white-label shell

Per `docs/SETUP_AND_DEPLOYMENT_WALKTHROUGH.md` + `docs/DESIGN_GUIDE_STARTER.md`:
1. Lock Part A (house brand): colors, fonts, logo.
2. Lock B1 + B2: token set, overridable subset, client config schema.
3. Draft component catalogue (shadcn/ui + Tailwind).

## Lessons logged (don't repeat)

- Netlify's "add domain" flow pushes an "Activate Netlify DNS" nameserver screen (`dns#.p08.nsone.net`) — IGNORE it. That's Option B. DNS lives in Cloudflare only.
- CNAME target is the `*.netlify.app` site address, never a nameserver. Spelling: n-e-t-l-i-f-y.app.
- Deploy the Netlify site BEFORE wiring DNS.

## First message for the next chat

> Read `HANDOFF.md` and `docs/BUILD_LOG.md`, then let's start Phase 2 (design system).
