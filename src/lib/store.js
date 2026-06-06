// Storefront back-office data model. Mock now so the admin dashboard is fully buildable;
// the real backend (publish to the live store / e-comm API) drops in behind getStore()/saveStore().
// See the Storefront Admin (src/components/tools/storefront-admin.jsx).

const MOCK = {
  montitrentini: {
    theme: {
      primary: "#7A1F2B",
      accent: "#C9A227",
      logo: "",
      heading: "Playfair Display",
      body: "Inter",
      hero: {
        headline: "Aged in the Dolomites. Delivered to your door.",
        subhead: "Small-batch Italian cheeses from Monti Trentini.",
      },
      layout: "grid",
    },
    products: [
      { id: "MT-ASIA-200", name: "Asiago DOP", price: 14.5, description: "Nutty, semi-firm Alpine cheese, aged 4 months.", status: "Active", collection: "Hard" },
      { id: "MT-GORG-150", name: "Gorgonzola Dolce", price: 11.0, description: "Creamy, mild blue with a buttery finish.", status: "Active", collection: "Blue" },
      { id: "MT-GRAN-1K", name: "Grana Padano wedge", price: 28.0, description: "Crystalline, savory grating cheese, aged 16 months.", status: "Low stock", collection: "Hard" },
      { id: "MT-PROV-500", name: "Provolone wheel", price: 22.0, description: "Stretched-curd cheese, sharp and smoky.", status: "Active", collection: "Semi-soft" },
    ],
    content: {
      announcement: "Free shipping on orders over $75.",
      banners: [
        { key: "hero", label: "Homepage hero", published: true },
        { key: "summer", label: "Summer cheese board promo", published: false },
      ],
      pages: [
        { key: "about", label: "About", published: true },
        { key: "shipping", label: "Shipping & returns", published: true },
        { key: "wholesale", label: "Wholesale inquiries", published: false },
      ],
    },
    settings: {
      status: "live", // live | maintenance
      currency: "USD",
      shippingFlat: 9.5,
      payment: "stripe",
    },
    orders: [
      { id: "WEB-2041", customer: "A. Rossi", total: 64.5, status: "Paid", date: "2026-06-06" },
      { id: "WEB-2040", customer: "J. Lin", total: 28.0, status: "Fulfilled", date: "2026-06-05" },
      { id: "WEB-2038", customer: "M. Díaz", total: 112.0, status: "Refunded", date: "2026-06-03" },
    ],
  },
};

const BACKEND = import.meta.env.VITE_STORE_BACKEND || "mock";
const USE_MOCK = BACKEND === "mock";
const USE_SHOPIFY = BACKEND === "shopify";

/** Load the store model for a tenant. Returns null if none. Synchronous: returns the portal-owned
 *  model (theme/content/settings + seed products). In Shopify mode, hydrate the products list with
 *  fetchStoreProducts() — Shopify owns products/checkout; the portal owns theme/content/admin. */
export function getStore(resolved) {
  return structuredClone(MOCK[resolved.id] || null);
}

/** Live product list for a tenant. Shopify (headless) when VITE_STORE_BACKEND=shopify, else the
 *  portal-owned seed products. Falls back to the seed list if the Storefront fetch fails. */
export async function fetchStoreProducts(resolved) {
  const seed = getStore(resolved)?.products || [];
  if (!USE_SHOPIFY) return seed;
  try {
    const res = await fetch(`/.netlify/functions/store?tenant=${encodeURIComponent(resolved.id)}`);
    if (!res.ok) return seed;
    const data = await res.json();
    return Array.isArray(data.products) && data.products.length ? data.products : seed;
  } catch {
    return seed;
  }
}

/** Live web orders for a tenant, via the Shopify Admin API (read_orders) when in shopify mode,
 *  else the portal-owned seed orders. Falls back to the seed list if the fetch fails. */
export async function fetchStoreOrders(resolved) {
  const seed = getStore(resolved)?.orders || [];
  if (!USE_SHOPIFY) return seed;
  try {
    const res = await fetch(`/.netlify/functions/store-orders?tenant=${encodeURIComponent(resolved.id)}`);
    if (!res.ok) return seed;
    const data = await res.json();
    return Array.isArray(data.orders) && data.orders.length ? data.orders : seed;
  } catch {
    return seed;
  }
}

/** Persist store changes. Mock = no-op (UI shows a saved toast). Real = publish to the store. */
export async function saveStore(resolved, _store) {
  if (USE_MOCK) return { ok: true, mock: true };
  // Real adapter (deferred): POST /.netlify/functions/store (auth required, secrets server-side).
  return { ok: true };
}
