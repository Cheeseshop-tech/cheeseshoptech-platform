# CheeseShop TECH — Design System

**Status:** LOCKED (Phase 2) · **Owner:** Rick Posada · **Last updated:** 2026-06-05
**Supersedes:** the `>>> DECIDE:` prompts in `DESIGN_GUIDE_STARTER.md` (that file is the outline; this is the resolved system).

> **Canonical fact.** The platform core IS CheeseShop TECH (owned IP). Clients are tenants.
> The *house brand* below is CheeseShop TECH's own identity. A *client skin* is produced by
> token overrides on top of the house defaults — never by forked code or bespoke screens.

---

## Part A — CheeseShop TECH House Brand

**Direction (current): warm artisanal.** The house brand is **Terracotta `#9A3B1B` primary +
Cellar Olive `#5F6B2E` accent** on warm-stone surfaces with a modern serif for headings — matching
the terracotta wordmark/favicon. Signals "specialty-food expert," matching the sales-led positioning.
This is the **house (CheeseShop TECH) palette only**; each tenant sets its own brand color (e.g.
tenant #1 Monti Trentini = Forest Green `#064E22` / Italia Green `#009640`). The warm house vs. a
client's own color is itself the agency-vs-client distinction.

> **History:** house brand went green for a stretch (2026-06-06 "House brand → Forest Green"), then
> swapped back to its own Terracotta + Cellar Olive (Rick, 2026-06-06) so the agency reads distinct
> from green clients like Monti. The earlier "cool-studio" Brand-Foundation rec is also superseded.

### A1. Foundation

- **Positioning one-liner:** *Sales-led growth for specialty & perishable food brands — campaigns, content, and the storefront to capture it.*
- **Voice:** confident, plainspoken, appetizing.

| Do | Don't |
|---|---|
| Lead with outcomes (sell-through, demand) | Lead with tech jargon |
| Concrete and sensory ("aged," "small-batch") | Generic SaaS filler |
| Short, declarative sentences | Hype, exclamation stacks, emoji |

### A2. Color

House palette. Hex is the source of truth; the token names below are what the code references.

| Role | Token | Hex | Usage |
|---|---|---|---|
| Brand primary "Terracotta" | `color.brand.primary` | `#9A3B1B` | Primary buttons, active states, key emphasis, masthead. White text passes AA (6.97:1). Also the wordmark/favicon color. |
| Brand accent "Cellar Olive" | `color.brand.accent` | `#5F6B2E` | Links, secondary highlights, charts. White text passes AA (5.79:1). |

*These are the **house** defaults; a tenant config overrides primary/accent with its own brand (Monti = Forest Green `#064E22` / Italia Green `#009640`).*
| Paper | `color.bg` | `#FAF6F0` | App background |
| Surface | `color.surface` | `#FFFFFF` | Cards, sheets, menus |
| Text | `color.fg` | `#221C14` | Primary text (espresso) |
| Muted text | `color.fg.muted` | `#6E5E48` | Secondary text, captions |
| Border | `color.border` | `#E6DBCB` | Hairlines, dividers, input borders |

**Warm neutral (stone) scale** — structural, not client-overridable:
`50 #FAF6F0 · 100 #F2EBE0 · 200 #E6DBCB · 300 #D6C6AE · 400 #B7A488 · 500 #8E7B62 · 600 #6E5E48 · 700 #524634 · 800 #382F22 · 900 #221C14`

**Semantic** (locked): `success #2E7D4F · warning #B7791F · error #B42318 · info #2E6F9E`. Each pairs with white on-color and a 10%-tint background for banners.

### A3. Typography

- **Headings:** **Fraunces** (variable serif, optical sizing on) — artisanal + modern. Fallback `Georgia, serif`.
- **Body / UI:** **Inter**. Fallback `system-ui, sans-serif`.
- **Mono (data/code):** **JetBrains Mono**. Fallback `ui-monospace, monospace`.

**"Ledger" display treatment (added 2026-06-06).** The editorial house signature, applied via the
shared layer so it cascades to every tenant + module (never per-client):
- **Page titles + section heads (`h1`,`h2`) render italic** Fraunces (base layer in `index.css`).
  Fraunces is loaded with the italic axis. `CardTitle` is also italic.
- **Tabular figures:** all `table`s use `font-variant-numeric: tabular-nums`; numeric/code cells use
  the mono token (`font-mono`) so columns align.
- **Helper utilities** (`index.css @layer components`): `.cs-display` (italic-serif display),
  `.cs-num` (mono tabular), `.cs-eyebrow` (10px uppercase tracked label). Use these, don't re-derive.
- **Stat tiles, tables, badges** were tightened to the Ledger feel (big italic-serif figures over
  eyebrow labels; finer tracked column heads; uppercase badge tags; flatter card elevation).

| Step | Token | rem / px | Use |
|---|---|---|---|
| xs | `font.size.xs` | 0.75 / 12 | Labels, captions |
| sm | `font.size.sm` | 0.875 / 14 | Secondary UI |
| base | `font.size.base` | 1 / 16 | Body |
| lg | `font.size.lg` | 1.25 / 20 | Lead text |
| xl | `font.size.xl` | 1.5 / 24 | H4 |
| 2xl | `font.size.2xl` | 2 / 32 | H3 / section |
| 3xl | `font.size.3xl` | 3 / 48 | H2 |
| 4xl | `font.size.4xl` | 3.75 / 60 | H1 / hero |

Weights: 400 / 500 / 600 / 700. Headings 600–700, line-height 1.1–1.2; body line-height 1.5.

### A4. Spacing, radius, elevation, icons

- **Spacing scale (rem):** 0 · 0.25 · 0.5 · 0.75 · 1 · 1.25 · 1.5 · 2 · 2.5 · 3 · 4 (Tailwind-aligned 4px base).
- **Radius:** `none 0 · sm 4 · md 8 · lg 12 · xl 16 · full 9999`. **House default = md.**
- **Elevation** (warm-tinted): `sm 0 1px 2px rgba(34,28,20,.08)` · `md 0 2px 8px rgba(34,28,20,.10)` · `lg 0 8px 24px rgba(34,28,20,.12)`.
- **Icons:** `lucide-react`, 1.5px stroke, rounded caps, 20/24px default.

### A5. Logo lockups

- **Primary wordmark:** "CheeseShop" in Fraunces 600 (Terracotta `#9A3B1B`, the house primary; see A2) + "TECH" in Inter 700, uppercase, wide-tracked (Espresso).
- **Mono:** single color — Espresso on light, Paper (#FAF6F0) on dark.
- **Favicon / monogram:** "cs" wedge mark.
- **Clear space:** cap-height of the "C" on all sides. **Min width:** 120px wordmark / 24px monogram.
- **Don't:** recolor outside palette, stretch/skew, add shadows/effects, place on a background below 4.5:1 contrast.
- A placeholder SVG wordmark ships at `public/brand/cstech-wordmark.svg`; replace with the final asset when ready (token `logo` falls back to it).

---

## Part B — The White-Label System

### B0. Branding model — two surfaces (LOCKED)

White-labeling is applied **differently on the two surfaces**, by design:

| Surface | Who sees it | Branding rule |
|---|---|---|
| **Storefront / DTC** | The client's *customers* | **100% client brand, always.** No CheeseShop TECH mark anywhere. A shopper must never see the platform brand. |
| **Internal portal / dashboard** | The client's *operators* (~2–3) | **Co-branded.** Client logo + tokens are dominant (it feels like their system), with a subtle persistent "powered by CheeseShop TECH" mark (sidebar footer). |

**Why co-brand the portal:** CheeseShop TECH is a coordinated-services brokerage (`POSITIONING.md`) — the quiet maker's mark keeps the platform's value visible to operators day-to-day (supports retention/renewal) without competing with the client's brand. It is intentionally subtle, not a takeover.

**Buyout note:** at a client buyout, the single-tenant fork **drops the "powered by" mark** — the client then owns a fully unbranded (their-brand-only) portal. Consistent with the canonical fact: the platform core never transfers, but the mark is not part of what the client paid to run.

Implementation: the mark lives in `AppShell` (sidebar footer). It shows on tenant portals; it is not a token (clients cannot remove it — only a buyout fork does).

### B1. Tokens: overridable vs locked

A token is a named design value rendered as a CSS custom property (`--cs-color-brand-primary`, `--cs-radius-md`, …). The shell renders from tokens; client config supplies a **bounded** set of overrides.

| Client-overridable | Locked (house-controlled, structural) |
|---|---|
| `color.brand.primary` | All neutrals (stone scale) |
| `color.brand.accent` | Semantic colors (success/warn/error/info) |
| `logo` | Spacing scale |
| `font.heading` | Type scale + line-heights |
| `font.body` | Elevation / shadows |
| `radius` (named step) | Breakpoints, z-index, focus-ring spec |

**Why bounded:** locking structure keeps every tenant legible and recognizably "powered by CheeseShop TECH," and lets us ship platform-wide visual upgrades to all clients at once. Differentiation = brand color + logo + type + corner radius. Nothing that can break layout or contrast is exposed.

### B2. Per-client config schema

Lives at `config/clients/<id>.json`. Schema enforced by `config/clients/client.schema.json`.

```json
{
  "id": "montitrentini",
  "subdomain": "montitrentini",
  "brand": {
    "name": "Monti Trentini",
    "logo": "https://res.cloudinary.com/<cloud>/clients/montitrentini/brand/logo.svg",
    "colors": { "primary": "#7A1F2B", "accent": "#C9A227" },
    "fonts": { "heading": "Playfair Display", "body": "Inter" },
    "radius": "md"
  },
  "cloudinaryFolder": "clients/montitrentini",
  "crm": "hubspot",
  "modules": ["catalog", "orders", "crm"]
}
```

**Validation rules**

| Field | Required | Rule | Fallback if absent |
|---|---|---|---|
| `id` | yes | `^[a-z0-9-]+$`, unique | — |
| `subdomain` | yes | `^[a-z0-9-]+$`, unique | — |
| `brand.name` | yes | non-empty string | — |
| `brand.colors.primary` | yes | `^#[0-9a-fA-F]{6}$` | — |
| `brand.colors.accent` | no | `^#[0-9a-fA-F]{6}$` | house accent `#5F6B2E` |
| `brand.logo` | no | URL | house wordmark SVG |
| `brand.fonts.heading` | no | in font allowlist | house `Fraunces` |
| `brand.fonts.body` | no | in font allowlist | house `Inter` |
| `brand.radius` | no | enum `none\|sm\|md\|lg\|xl` | `md` |
| `cloudinaryFolder` | no | string | `clients/<id>` |
| `crm` | no | enum `hubspot\|none` | `none` |
| `modules` | no | array of `catalog\|orders\|crm\|media\|campaigns` | `[]` |

**Core rule:** a missing client value **falls back to the house default — never breaks.**

**Font allowlist** (bounds web-font loading): Inter, Fraunces, Playfair Display, Lora, Source Sans 3, Work Sans, Libre Franklin, Merriweather, JetBrains Mono.

### B3. Theming mechanics (locked decision)

**CSS custom properties + Tailwind theme extension** — not CSS-in-JS. Tailwind color/radius utilities reference `var(--cs-*)`; at runtime the theme injector resolves the active client and writes the overridable vars onto `:root`. Locked tokens are baked into the base stylesheet.

**Contrast guardrail (WCAG AA):** before applying a client's `primary`/`accent`, the injector computes the on-color (white vs espresso) by relative luminance and enforces ≥4.5:1 for text. If a supplied brand color can't reach AA against either on-color, the build/console **warns** and the system uses the nearest safe on-color so a client's palette can never produce an unreadable dashboard.

### B4. Component catalogue — SHIPPED (Phase 2)

Base library pattern: **shadcn/ui** (Radix primitives + `cva` + `tailwind-merge`), themed entirely through the tokens above. All components live in `src/components/ui/` (primitives) and `src/components/layout/` (shell); every interactive element carries the AA focus ring and is keyboard-accessible (Part D).

| Component | File | Notes |
|---|---|---|
| Button | `ui/button.jsx` | Variants: primary/secondary/outline/ghost/destructive · sizes sm/md/lg/icon · `asChild` + ref forwarding |
| Card (+ Header/Title/Description/Content) | `ui/card.jsx` | Surface + token radius + warm elevation |
| Input / Textarea | `ui/input.jsx` | Token-themed text fields |
| Label | `ui/label.jsx` | Radix Label, `htmlFor` association |
| Select | `ui/select.jsx` | Radix Select — Trigger/Content/Item/Value |
| Checkbox | `ui/checkbox.jsx` | Radix; checked state = brand primary |
| RadioGroup / RadioGroupItem | `ui/radio-group.jsx` | Radix |
| Switch | `ui/switch.jsx` | Radix toggle |
| Badge | `ui/badge.jsx` | brand/accent/outline/muted + semantic |
| Table (+ Header/Body/Row/Head/Cell) | `ui/table.jsx` | Data table primitives, horizontal scroll |
| Tabs | `ui/tabs.jsx` | Radix; underline-active |
| Dialog/Modal | `ui/dialog.jsx` | Radix; focus trap, ESC, overlay |
| Toast | `ui/toast.jsx` | Radix + `ToastProvider` / `useToast()` hook; tones default/success/warning/error/info |
| Breadcrumb | `ui/breadcrumb.jsx` | `items=[{label, href}]`, `aria-current` on last |
| EmptyState | `ui/empty-state.jsx` | icon + title + description + action |
| Skeleton | `ui/skeleton.jsx` | pulse; auto-disables under reduced-motion |
| Stat | `ui/stat.jsx` | Ledger metric tile: big italic-serif figure + `.cs-eyebrow` label (+ optional badge) |
| AppShell (Sidebar + Topbar) | `layout/app-shell.jsx` | Portal layout; branding flows via tokens |

States covered per component: default/hover/active/disabled/loading/error as applicable. New components must follow this same pattern and be added to this table before shipping (Part E).

---

## Part C — Content & Photography (pointer)

Formalized from existing best-practice work; see `DESIGN_GUIDE_STARTER.md` Part C and Ops Manual §6. Master crop ratios and named Cloudinary transforms (`thumb`, `card`, `hero`) to be locked in the content-studio pass. Gains weight under the `POSITIONING.md` content-studio pillar.

---

## Part D — Accessibility & Quality Bar (WCAG 2.1 AA floor)

"Design done" for a client skin — all must pass before UAT:

- Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI components).
- Visible focus ring (2px, `color.brand.primary`) on every interactive element.
- Full keyboard navigation; logical tab order.
- Touch targets ≥ 44×44px.
- Alt text on all meaningful imagery.
- Honors `prefers-reduced-motion`.
- Client brand colors pass the B3 contrast guardrail.

---

## Part E — Scaling to 10–20 clients (discipline)

- **No bespoke layouts per client.** Differentiation = tokens + content, never new screens.
- New visual patterns enter the **shared** system first, then become available to all.
- Every new token/component is documented here before it ships (single source of truth).
- **Escalation rule:** if a client needs something the token system can't express, **Rick approves** adding it to the shared system or declines it. No one-off forks.
- Quarterly review: prune one-offs, consolidate duplicates.

---

*CheeseShop TECH · CheeseShopTECH.com · Posada & Co.*
