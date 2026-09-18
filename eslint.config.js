// Added 2026-09-18 after the Buyer Catalog crash: `useMemo` referenced `resolved`, a variable
// that only existed in the parent component's scope. JavaScript resolves that as a free
// variable rather than a build error, so `vite build` stayed green and the bug shipped straight
// to production. See docs/POSTMORTEM_2026-09-18_buyer-catalog-crash.md.
//
// Scope is deliberately narrow: `no-undef` (the exact defect class from the incident) plus the
// two react-hooks rules (rules-of-hooks catches a hook called conditionally/outside a component;
// exhaustive-deps catches the "used a value the effect/memo didn't declare" pattern that this
// incident is a member of). Not the full eslint:recommended set — that would surface a large
// amount of pre-existing, unrelated debt in one pass and this needs to gate the build starting
// today, not after a separate cleanup project.
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "_archive/**"],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, __BUILD_STAMP__: "readonly" },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["netlify/functions/**/*.js", "scripts/**/*.mjs", "*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-undef": "error",
    },
  },
];
