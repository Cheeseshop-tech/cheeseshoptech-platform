# src/ — React shell (placeholder)

The shared, single-codebase React app. **No client-specific code here** — all client
differentiation comes from `config/clients/<client>.json` (Operations Manual §3).

Built out in Phases 2–4 of `docs/SETUP_AND_DEPLOYMENT_WALKTHROUGH.md`.

Planned layout:

```
src/
  lib/clientConfig.js   tenant resolution — reads subdomain, loads matching JSON, injects brand tokens
  components/           shared shell components (nav, cards, tables, forms, modals, empty states)
```
