// Shared authenticated-fetch helpers (cst-hardening-plan.md Part A item 2, 2026-09-03).
//
// Why this exists: CRM-05 (see crm-05-hubspot-zero-accounts.md) was one file hand-rolling
// `fetch(...) + authHeaders() + if (!res.ok)` and getting the failure branch wrong -- a failed
// read silently became a success-shaped empty value. Auditing found the same hand-rolled shape
// repeated almost verbatim across crm.js, campaigns.js, prices.js, media.js. Item 1 (2026-09-03)
// fixed every call site by hand; these two helpers are the "make it stay fixed" follow-up -- a
// new read/write call site built on top of these can't reintroduce the masking pattern, because
// the failure branch is baked into the helper instead of retyped (and possibly gotten wrong)
// every time.
//
// These are intentionally narrow (tenant-scoped JSON over our own Netlify Functions, credentialed
// with authHeaders()) rather than a general-purpose fetch wrapper -- that's the actual shape every
// current call site needs, and a narrower contract is easier to get right at every call site.

import { authHeaders } from "./auth-context.jsx";

/**
 * GET a tenant-scoped JSON document with authenticated headers.
 *
 * Resolves the parsed body on a 200. Resolves `onFail` (default `null`) on ANY failure -- a
 * non-2xx status, a network error, or a body that fails to parse as JSON -- never a value that
 * could be mistaken for real empty data. Never throws.
 *
 * `onFail` lets a caller opt into a different failure sentinel where `null` doesn't fit the
 * shape it iterates directly (e.g. `[]` for a list) -- but whatever sentinel is chosen must still
 * be distinguishable from a genuine empty success by the caller (see the CRM-05 postmortem for
 * why `{}`/`[]` on failure is the exact bug this helper exists to prevent). When in doubt, prefer
 * the `null` default and gate on it explicitly, the way getCrmData()/getOutreach() do.
 */
export async function readAuthedJson(url, { onFail = null } = {}) {
  try {
    const res = await fetch(url, { headers: { ...(await authHeaders()) } });
    if (!res.ok) return onFail;
    return await res.json();
  } catch {
    return onFail;
  }
}

/**
 * Write (POST/DELETE/etc.) a tenant-scoped JSON body with authenticated headers.
 *
 * Resolves `{ ok, status, ...data }` -- `ok`/`status` mirror the fetch Response, `data` is the
 * parsed JSON response body merged in (best-effort; `{}` if there is none or it isn't JSON, so
 * `{ok, status, ...data}` degrades cleanly to just `{ok, status}` for callers that don't send a
 * body back). A thrown network error resolves `{ ok: false, status: 0, error }` rather than
 * rejecting, matching every existing write call site so callers never need a try/catch of their
 * own around this.
 */
export async function writeAuthedJson(url, { method = "POST", body, headers = {} } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...headers,
        ...(await authHeaders()),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...data };
  } catch (e) {
    return { ok: false, status: 0, error: String(e?.message || e) };
  }
}
