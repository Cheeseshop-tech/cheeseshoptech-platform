// Per-tenant item SEEDS — generated from each tenant's catalog by scripts/build-items-seed.mjs.
// Seeds only fill BLANK fields at load time (see withSeed in items.js); anything saved through
// the Media Hub always wins. Add new tenants here as their catalogs come online.

import montiSeed from "@/data/montitrentini/items-seed.json";

const SEEDS = {
  "monti-trentini": montiSeed, // config/clients/montitrentini.json cloudinaryFolder
};

export function seedFor(tenantFolder) {
  return SEEDS[tenantFolder] || null;
}
