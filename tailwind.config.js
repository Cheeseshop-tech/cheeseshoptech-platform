/** @type {import('tailwindcss').Config} */
// Tailwind theme is bound to CSS custom properties (--cs-*). House defaults live in
// src/index.css :root; the runtime theme injector (src/lib/theme.js) overrides the
// client-overridable vars per tenant. Locked tokens stay fixed here. See DESIGN_SYSTEM.md.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--cs-color-bg)",
        surface: "var(--cs-color-surface)",
        border: "var(--cs-color-border)",
        fg: {
          DEFAULT: "var(--cs-color-fg)",
          muted: "var(--cs-color-fg-muted)",
        },
        brand: {
          DEFAULT: "var(--cs-color-brand-primary)",
          primary: "var(--cs-color-brand-primary)",
          "on-primary": "var(--cs-color-on-primary)",
          accent: "var(--cs-color-brand-accent)",
          "on-accent": "var(--cs-color-on-accent)",
        },
        success: "var(--cs-color-success)",
        warning: "var(--cs-color-warning)",
        error: "var(--cs-color-error)",
        info: "var(--cs-color-info)",
      },
      fontFamily: {
        heading: "var(--cs-font-heading)",
        sans: "var(--cs-font-body)",
        body: "var(--cs-font-body)",
        mono: "var(--cs-font-mono)",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.5" }],
        lg: ["1.25rem", { lineHeight: "1.4" }],
        xl: ["1.5rem", { lineHeight: "1.25" }],
        "2xl": ["2rem", { lineHeight: "1.2" }],
        "3xl": ["3rem", { lineHeight: "1.1" }],
        "4xl": ["3.75rem", { lineHeight: "1.05" }],
      },
      borderRadius: {
        none: "0",
        sm: "var(--cs-radius-sm)",
        md: "var(--cs-radius-md)",
        lg: "var(--cs-radius-lg)",
        xl: "var(--cs-radius-xl)",
        base: "var(--cs-radius-base)",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(34,28,20,.08)",
        md: "0 2px 8px rgba(34,28,20,.10)",
        lg: "0 8px 24px rgba(34,28,20,.12)",
      },
      ringColor: {
        brand: "var(--cs-color-brand-primary)",
      },
    },
  },
  plugins: [],
};
