// Netlify Function: fetch a tenant's storefront PRODUCTS from the Shopify Storefront API.
// Headless model (STOREFRONT_STRATEGY): Shopify owns products + checkout/payments/tax/inventory;
// the portal owns the experience + admin content (theme/banners/pages live in the portal, NOT
// Shopify). This function covers the products read path only. The Storefront access token + store
// domain are server-side secrets — never in the browser bundle. Activates when SHOPIFY_STORE_DOMAIN
// + SHOPIFY_STOREFRONT_TOKEN are set (see .env.example). Front end uses it when VITE_STORE_BACKEND=shopify.

const API_VERSION = "2024-10";
const PRODUCTS_QUERY = `
  query Products($n: Int!) {
    products(first: $n) {
      edges {
        node {
          id
          title
          description
          availableForSale
          productType
          priceRange { minVariantPrice { amount currencyCode } }
          variants(first: 1) { edges { node { sku } } }
        }
      }
    }
  }`;

export const handler = async () => {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;       // e.g. monti-trentini.myshopify.com
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;    // Storefront API access token
  if (!domain || !token) {
    return json(500, { error: "SHOPIFY_STORE_DOMAIN / SHOPIFY_STOREFRONT_TOKEN not configured" });
  }

  try {
    const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { n: 100 } }),
    });
    if (!res.ok) return json(res.status, { error: `Shopify ${res.status}` });
    const body = await res.json();
    if (body.errors) return json(502, { error: body.errors });

    // Map Shopify products to the portal's store-product shape (src/lib/store.js).
    const products = (body.data?.products?.edges || []).map(({ node }) => ({
      id: node.variants?.edges?.[0]?.node?.sku || node.id,
      name: node.title,
      price: Number(node.priceRange?.minVariantPrice?.amount || 0),
      description: node.description || "",
      status: node.availableForSale ? "Active" : "Out of stock",
      collection: node.productType || "",
    }));
    return json(200, { products });
  } catch (err) {
    return json(502, { error: String(err?.message || err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=120" },
    body: JSON.stringify(body),
  };
}
