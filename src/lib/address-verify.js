// Client wrapper for the on-demand address verification button in the campaign call console
// (docs/ADDRESS_VERIFICATION_SPEC_2026-09-21.md). Own file, not folded into campaigns.js or
// crm.js — same "one purpose per lib file" convention those two already follow.

import { writeAuthedJson } from "./authed-fetch.js";

/**
 * Verify a street/city/state/zip against Google's Address Validation API (server-side key,
 * see netlify/functions/address-verify.js). Resolves:
 *   { ok: true, verdict: "confirmed"|"corrected"|"unconfirmed", formatted: {street,city,state,zip} }
 *   { ok: false, error }   — including error: "not-configured" when no API key is set yet, so
 *                            the UI can show "address lookup not configured" instead of a
 *                            generic failure.
 * Never throws (writeAuthedJson's contract) — a network error resolves { ok:false, error }.
 */
export async function verifyAddress(resolved, { street = "", city = "", state = "", zip = "" } = {}) {
  const res = await writeAuthedJson("/.netlify/functions/address-verify", {
    body: { tenant: resolved?.id, street, city, state, zip },
  });
  if (!res.ok) return { ok: false, error: res.error || `HTTP ${res.status}` };
  return res;
}
