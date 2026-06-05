# CheeseShop TECH — Design Guide (Starter Outline)

**Stage:** Consult → to be developed in the new Project. **Owner:** Rick Posada.
**Status:** Scaffold + prompts to fill in. This is document #3 of the founding set
(the "Best Practices Manual" formalized as a Design Guide).

> **How to use this in the new Project:** open this file + `CheeseShopTECH_Cowork_Brief.md`
> together. The Brief sets the platform scope; this guide turns it into a **white-label
> design system** that scales to 10–20 clients without per-client design debt. Fill the
> `>>> DECIDE:` prompts as you go; each locked decision should also get a Build Log entry.

---

## Part A — CheeseShop TECH House Brand

The agency's own identity (the CSTECH shell, marketing site, login screens — the parts
clients see as "powered by CheeseShop TECH").

### A1. Brand foundation
- Mission / positioning one-liner (perishable & specialty-food e-commerce, done right).
- Voice & tone: 3 adjectives + a do/don't table.
- `>>> DECIDE:` house logo lockups (primary, mono, favicon) and clear-space rules.

### A2. Core visual language
- Color: primary, secondary, neutrals, semantic (success/warn/error), with hex + usage.
- Typography: heading + body typefaces, scale (e.g. 12/14/16/20/24/32/48), weights.
- Spacing scale, radius, elevation/shadow, iconography style.
- `>>> DECIDE:` is the house palette warm/artisanal (cheese/food cues) or clean/tech-neutral?

---

## Part B — The White-Label System (the scalability engine)

**This is the most important section.** It defines how one shared React shell becomes any
client's branded portal via config alone — no forked code per client.

### B1. Design tokens
A token is a named design value (`color.brand.primary`, `font.heading`, `radius.md`).
The shell renders from tokens; each client config supplies overrides.

- Define the **full house token set** (the defaults).
- Define which tokens are **client-overridable** vs **locked** (structural tokens stay fixed
  so every client stays usable and on-brand for CSTECH).
- `>>> DECIDE:` the overridable list. Recommended minimum:
  `color.brand.primary`, `color.brand.accent`, `logo`, `font.heading`, `font.body`, `radius`.

### B2. Per-client config → tokens (maps to brief's JSON config)
```json
{
  "id": "montitrentini",
  "subdomain": "montitrentini",
  "brand": {
    "name": "Monti Trentini",
    "logo": "https://res.cloudinary.com/.../clients/montitrentini/brand/logo.svg",
    "colors": { "primary": "#7A1F2B", "accent": "#C9A227" },
    "fonts": { "heading": "Playfair Display", "body": "Inter" },
    "radius": "md"
  }
}
```
- `>>> DECIDE:` exact schema + validation rules (what's required, allowed value ranges).
- Rule: a missing client value **falls back to the house default** — never breaks.

### B3. Theming mechanics
- Inject tokens as CSS custom properties at the app root, keyed off the resolved client.
- `>>> DECIDE:` CSS variables + Tailwind theme extension, or a CSS-in-JS theme provider.
- Guardrails: enforce a **minimum contrast (WCAG AA)** on client color combos so a client's
  brand colors can't produce an unreadable dashboard.

### B4. Component standards
- Catalogue the shell components (nav, cards, tables, forms, modals, empty states).
- Each component: variants, states (default/hover/active/disabled/loading/error), a11y notes.
- `>>> DECIDE:` component library base (shadcn/ui + Tailwind recommended for speed + theming).

---

## Part C — Content & Photography Standards

Where the existing "Best Practices" work gets formalized. Critical for food/perishable brands.

### C1. Product photography
- Shot list per product (hero, packaging, detail, in-context/lifestyle).
- Lighting, background, and color-accuracy rules (cheese reads very differently under warm vs cool light).
- Aspect ratios + crops the platform expects; resolution + file-format targets.
- `>>> DECIDE:` master crop ratios (e.g. 1:1 grid, 4:5 product, 16:9 hero) — must match Cloudinary transforms.

### C2. Cloudinary delivery rules
- Folder convention (mirror Ops Manual §6: `clients/<client>/{products,brand,raw}`).
- Naming (keep SKU in public_id), and delivery transforms applied via URL, not re-upload.
- `>>> DECIDE:` named transformation presets (thumb, card, hero) so the codebase references names, not raw params.

### C3. Copy & content
- Product description template (length, structure, tone per client voice).
- Price-list formatting standards.
- `>>> DECIDE:` who writes copy (agency vs client) and the review/approval flow.

---

## Part D — Accessibility & Quality Bar

- WCAG 2.1 AA as the floor: contrast, keyboard nav, focus states, touch targets, alt text.
- Definition of "design done" for a client skin (a checklist to pass before UAT).
- `>>> DECIDE:` the per-client design QA checklist (ties into Ops Manual §8 UAT).

---

## Part E — Scaling to 10–20 Clients (design discipline)

- **No bespoke layouts per client.** Differentiation = tokens + content, not new screens.
- New visual patterns go into the **shared** system first, then become available to all.
- Every new component/token is documented here before it ships (single source of truth).
- Quarterly design-system review: prune one-offs, consolidate duplicates.
- `>>> DECIDE:` the escalation rule — when a client *requires* something the system can't
  express, who approves adding it to the shared system vs declining.

---

## Suggested kickoff order for the new Project

1. Lock **Part A** (house brand) — small, fast, unblocks everything visual.
2. Lock **B1 + B2** (token set + overridable list + config schema) — the scalability core.
3. Draft **B4** component catalogue against the dashboard shell wireframe.
4. Formalize **Part C** from existing photography/content work.
5. Set the **Part D** QA bar; wire it into the onboarding UAT step.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
