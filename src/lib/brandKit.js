// Brand Kit — the SINGLE SOURCE of a tenant's brand truth (BRAND_KIT_AND_PROPOSAL_SPEC.md):
// identity (logo/color/type), brand imagery, voice, and modular story blocks. Managed by
// CheeseShop TECH (the monthly-fee orchestration). One kit feeds portal theming, the Theme
// Engine, and the Proposal Builder — nothing duplicates brand data ("one mind, one body").
//
// Pilot: bundled per-tenant JSON; a real backend (house-admin edits → store) drops in behind
// getBrandKit() later, same shape. New clients clone _brand-kit-template.json (the worksheet).

import mtBrandKit from "@/data/montitrentini/brand-kit.json";
import tplBrandKit from "@/data/_template/brand-kit.json";

const BUNDLES = {
  montitrentini: mtBrandKit,
  // Content-free clone kit (placeholder hexes blanked so config colors win until the kit is real).
  demo: tplBrandKit,
};

/** The brand kit for a tenant, or null if none defined yet. */
export function getBrandKit(resolved) {
  return BUNDLES[resolved?.id] || null;
}

/** Audience tags used across story blocks + (later) the proposal builder's targeting. */
export const AUDIENCES = [
  { id: "retail", label: "Retail / specialty grocer" },
  { id: "foodservice", label: "Foodservice / chef" },
  { id: "distributor", label: "Distributor" },
];

/** Story blocks filtered to an audience (or all). Used by Proposal Builder v2. */
export function storyBlocksFor(resolved, audience) {
  const kit = getBrandKit(resolved);
  const blocks = kit?.storyBlocks || [];
  if (!audience) return blocks;
  return blocks.filter((b) => (b.audience || []).includes(audience));
}

// Worksheet descriptor — drives the Brand Management onboarding form for new clients:
// which fields, input types (text/textarea/color/list/upload/select), and help text.
export const KIT_SECTIONS = [
  {
    key: "voice",
    title: "Voice & messaging",
    help: "The brand's words — how it sounds. This is the 'UI version of brand voice'.",
    fields: [
      { path: "voice.positioningHook", label: "Positioning hook", type: "textarea", help: "The one-line lead — what the brand IS." },
      { path: "voice.motto", label: "Motto", type: "text" },
      { path: "voice.mantra", label: "Mantra", type: "text" },
      { path: "voice.heritage", label: "Heritage line", type: "text" },
      { path: "voice.mission", label: "Mission", type: "textarea" },
      { path: "voice.coreValues", label: "Core values", type: "list" },
      { path: "voice.attributes", label: "Voice attributes", type: "list", help: "Adjectives the copy should feel like." },
      { path: "voice.avoid", label: "Avoid", type: "list", help: "What the brand never sounds like." },
      { path: "voice.readyPhrases", label: "Approved phrasing", type: "list", help: "Drop-in sentences reps + proposals can reuse." },
    ],
  },
  {
    key: "identity",
    title: "Visual identity",
    help: "Logo, color system, type — the brand's look.",
    fields: [
      { path: "identity.logo.primary", label: "Primary logo", type: "upload" },
      { path: "identity.logo.wordmark", label: "Wordmark", type: "upload" },
      { path: "identity.logo.seal", label: "Seal / certification mark", type: "upload" },
      { path: "identity.radius", label: "Corner radius", type: "select", options: ["none", "sm", "md", "lg", "xl"] },
    ],
  },
  {
    key: "imagery",
    title: "Brand-defining imagery",
    help: "Hero + lifestyle shots that carry the brand (drag-and-drop upload).",
    fields: [
      { path: "imagery.hero", label: "Hero image", type: "upload" },
      { path: "imagery.lifestyle", label: "Lifestyle images", type: "upload-list" },
    ],
  },
];
