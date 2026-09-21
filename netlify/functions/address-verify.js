// Netlify Function: on-demand US address verification for the campaign call console
// (docs/ADDRESS_VERIFICATION_SPEC_2026-09-21.md). Rick, 2026-09-21: "in the enrichment or
// anywhere we are running a campaign with prospects we need the look up function to confirm
// address state, city, town zip code and street address."
//
// Calls Google's Address Validation API server-side, using GOOGLE_ADDRESS_VALIDATION_KEY
// (never reaches the browser — same pattern as HUBSPOT_TOKEN in crm-hubspot.js). Gated by
// requireWriteAuth() like every other write/mutating endpoint (client-admin/admin only) — each
// call is a real, billed outside request, not a free read, so it isn't opened to the base
// client (read-only) tier the way crm-hubspot.js is.
//
// Returns a small, sanitized shape only — never Google's raw response and never the API key.
//
// POST { tenant, street, city, state, zip } → { ok, verdict, formatted: {street, city, state, zip} }
//   verdict: "confirmed" | "corrected" | "unconfirmed"

import { requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";
import { withMonitoring } from "./_sentry.js";

const GOOGLE_ENDPOINT = "https://addressvalidation.googleapis.com/v1:validateAddress";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-portal-passcode",
};
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  body: JSON.stringify(body),
});
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Google's per-component confirmationLevel → does this address stand as typed, or need a look? */
function verdictOf(result) {
  const v = result?.verdict || {};
  const components = result?.address?.addressComponents || [];
  const hasUnconfirmed = components.some((c) => c.confirmationLevel === "UNCONFIRMED_AND_SUSPICIOUS")
    || v.hasUnconfirmedComponents;
  if (hasUnconfirmed || v.addressComplete === false) return "unconfirmed";
  if (v.hasReplacedComponents || v.hasInferredComponents) return "corrected";
  return "confirmed";
}

const rawHandler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  const writeAuth = requireWriteAuth(event, tenant, context);
  if (!writeAuth.ok) {
    await logWrite(event, { fn: "address-verify", ok: false, status: writeAuth.status });
    return jsonUnauthorized(writeAuth);
  }

  const key = process.env.GOOGLE_ADDRESS_VALIDATION_KEY;
  if (!key) return json(200, { ok: false, error: "not-configured" });

  const street = str(body.street, 200);
  const city = str(body.city, 100);
  const state = str(body.state, 40);
  const zip = str(body.zip, 20);
  if (!street && !city && !state && !zip) return json(400, { error: "Nothing to verify" });

  try {
    const res = await fetch(`${GOOGLE_ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address: {
          regionCode: "US",
          addressLines: street ? [street] : [],
          locality: city || undefined,
          administrativeArea: state || undefined,
          postalCode: zip || undefined,
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json(200, { ok: false, error: `Google Address Validation ${res.status}`, detail: detail.slice(0, 300) });
    }
    const data = await res.json();
    const result = data?.result;
    const addr = result?.address?.postalAddress || {};
    const formatted = {
      street: str((addr.addressLines || [])[0] || "", 200) || street,
      city: str(addr.locality || "", 100) || city,
      state: str(addr.administrativeArea || "", 40) || state,
      zip: str(addr.postalCode || "", 20) || zip,
    };
    const verdict = verdictOf(result);
    await logWrite(event, { fn: "address-verify", ok: true, tenant, role: writeAuth.role, verdict });
    return json(200, { ok: true, verdict, formatted });
  } catch (err) {
    return json(502, { ok: false, error: String(err?.message || err) });
  }
};

export const handler = withMonitoring("address-verify", rawHandler);
