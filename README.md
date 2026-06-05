# cheeseshoptech-platform

Multi-tenant client portal platform for perishable & specialty-food e-commerce.
**Platform core = CheeseShop TECH (owned IP).** Clients are tenants. Monti Trentini is tenant #1.

## Where to start

1. **`docs/SETUP_AND_DEPLOYMENT_WALKTHROUGH.md`** — the execution runbook. Work it top to bottom.
2. `docs/CheeseShopTECH_Cowork_Brief.md` — scope and architecture decisions (north star).
3. `docs/OPERATIONS_MANUAL.md` — technical detail (domain/SSL, deploy, Cloudinary, CRM, security, buyout).
4. `docs/DESIGN_GUIDE_STARTER.md` — white-label token system.
5. `docs/PRICING_AND_ENGAGEMENT_MODEL.md` — build / operate / buyout structure.
6. `docs/BUILD_LOG.md` — append-only decision record (newest on top). **Log every material change here.**

## Structure

```
docs/              founding docs + the setup/deployment walkthrough
config/clients/    per-client JSON config (_template.json is the schema)
public/coming-soon/ deployable placeholder to claim the URL (Phase 1)
src/               React shell (shared codebase) + per-client config loader
```

## Rules of the road

- One shared codebase. Differentiation = config + content, never forked code per client.
- Secrets live in Netlify env vars, never in this repo. `.env` is gitignored.
- One change = one commit; significant decisions also get a `BUILD_LOG.md` entry.

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
