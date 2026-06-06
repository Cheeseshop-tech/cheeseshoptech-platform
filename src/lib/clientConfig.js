// Tenant resolution. Reads the subdomain, loads the matching client JSON, and merges it
// over the house defaults so a missing client value never breaks (DESIGN_SYSTEM.md B2).

import { HOUSE } from "./tokens.js";
import { resolveOnColor } from "./contrast.js";

// Eagerly import every client config at build time. Vite inlines these.
const modules = import.meta.glob("/config/clients/*.json", { eager: true });

// Build a registry keyed by subdomain, skipping the template and schema files.
const REGISTRY = {};
for (const [path, mod] of Object.entries(modules)) {
  if (path.endsWith("_template.json") || path.endsWith("client.schema.json")) continue;
  const cfg = mod.default ?? mod;
  if (cfg && cfg.id && cfg.subdomain) REGISTRY[cfg.subdomain] = cfg;
}

/** Extract the tenant subdomain from a hostname. Returns null for apex/www/localhost. */
export function subdomainFromHost(host = "") {
  const h = host.split(":")[0]; // strip port
  if (!h || h === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
  const parts = h.split(".");
  // cheeseshoptech.com -> 2 parts (apex). <client>.cheeseshoptech.com -> 3.
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (sub === "www") return null;
  return sub;
}

/**
 * Resolve the active tenant into a fully-populated brand object (house defaults applied)
 * plus computed accessible on-colors. Pass an explicit subdomain to override host sniffing
 * (useful for local dev: ?client=montitrentini).
 */
export function resolveClient(explicitSubdomain) {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const fromQuery = params?.get("client");
  const host = typeof window !== "undefined" ? window.location.host : "";
  const sub = explicitSubdomain || fromQuery || subdomainFromHost(host);

  const client = (sub && REGISTRY[sub]) || null;
  const isHouse = !client;

  const brand = {
    name: client?.brand?.name ?? HOUSE.brand.name,
    // House falls back to the house wordmark; a tenant with no logo renders its brand NAME
    // (text) instead — never the house wordmark, which would be brand confusion.
    logo: client?.brand?.logo || (isHouse ? HOUSE.brand.logo : ""),
    colors: {
      primary: client?.brand?.colors?.primary || HOUSE.brand.colors.primary,
      accent: client?.brand?.colors?.accent || HOUSE.brand.colors.accent,
    },
    fonts: {
      heading: client?.brand?.fonts?.heading || HOUSE.brand.fonts.heading,
      body: client?.brand?.fonts?.body || HOUSE.brand.fonts.body,
    },
    radius: client?.brand?.radius || HOUSE.brand.radius,
  };

  const id = client?.id ?? "house";
  return {
    id,
    subdomain: sub ?? null,
    isHouse,
    brand,
    crm: client?.crm ?? "none",
    modules: client?.modules ?? [],
    tools: client?.tools ?? [],
    home: client?.home ?? HOUSE.home ?? null,
    cloudinaryFolder: client?.cloudinaryFolder || `clients/${id}`,
    onPrimary: resolveOnColor(brand.colors.primary),
    onAccent: resolveOnColor(brand.colors.accent),
  };
}

/** All registered tenants (for dev tooling / a tenant switcher). */
export function listClients() {
  return Object.values(REGISTRY);
}
