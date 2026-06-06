# src/ — CheeseShop TECH shared React shell

The shared, single-codebase React app. **No client-specific code here** — all client
differentiation comes from `config/clients/<client>.json` via design tokens.
See `docs/DESIGN_SYSTEM.md`.

## Layout

```
src/
  main.jsx              entry: resolve tenant -> apply theme -> render
  App.jsx               Phase 2 demonstrator shell + live tenant switcher
  index.css             @tailwind + :root HOUSE token defaults (warm artisanal)
  lib/
    tokens.js           house default tokens, radius scale, font allowlist/stacks
    contrast.js         WCAG luminance + contrast + AA on-color resolver
    theme.js            inject resolved tokens as --cs-* CSS vars; AA guardrail; font loading
    clientConfig.js     subdomain -> load client JSON -> merge over house defaults
  components/ui/
    button.jsx          shadcn-pattern (cva) reference component
    card.jsx            reference component
```

## How theming works

Tailwind utilities are bound to CSS custom properties (`tailwind.config.js`). The house
defaults live in `index.css :root`. At runtime `theme.applyTheme()` overrides only the
**client-overridable** vars (brand colors, fonts, radius, logo) for the active tenant;
locked/structural tokens never change. A missing client value falls back to the house
default, so a tenant config can never break the UI.

## Run

`npm run dev` — local dev (preview a tenant with `?client=<subdomain>`).
`npm run build` — production build to `dist/`.
`npm run validate:clients` — lint every client config against the schema + AA contrast bar.

Built out across Phases 2–4 of `docs/SETUP_AND_DEPLOYMENT_WALKTHROUGH.md`.
