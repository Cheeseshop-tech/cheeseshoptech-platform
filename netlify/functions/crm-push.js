// Netlify Function: push cleared ENRICHMENT rows into HubSpot as contacts.
//
// This is the FIRST write path to HubSpot in this codebase. Everything else (crm-hubspot.js,
// crm-summary.js) is read-only by deliberate design, and that posture was protective: HubSpot is
// the CRM of record, so a bad row propagates and someone cleans it up by hand. So this function
// is built to be hard to fire by accident:
//
//   · DRY RUN BY DEFAULT. Without `commit: true` it resolves what WOULD happen — create vs
//     update, matched contact id, company association — and writes nothing at all.
//   · House/client-admin passcode required, same as every other write endpoint.
//   · Only rows the app considers CLEARED are accepted (an email AND a buyer name). A
//     disqualified or half-finished row can't reach HubSpot.
//   · Sequential, small batches. HubSpot caps search at ~4 req/s and crm-hubspot.js already
//     learned that lesson the hard way — a parallel burst 429s and the payload comes back zeros.
//
// REQUIRES the private app to carry `crm.objects.contacts.write` (Starter tier has it; the
// account already pays for CONTACT write). Without it HubSpot answers 403 and this returns the
// error verbatim rather than pretending it worked.
//
// POST { tenant, rows, commit? } → { ok, dryRun, planned:[...], results:[...] }
//   rows = [{ companyId, companyName, buyer, title, email, phone, instagram, note, outcome }]

import { requireWriteAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

import { withMonitoring } from "./_sentry.js";
const HS = "https://api.hubapi.com";
const MAX_ROWS = 200;

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hs(token, path, { method = "GET", body } = {}) {
  const res = await fetch(`${HS}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const msg = data?.message || text?.slice(0, 200) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    // HubSpot names the exact scopes it wanted in context.requiredScopes, and which of them the
    // token actually carries. Throwing that away turned every permission problem into the same
    // opaque sentence — surface it so a 403 is diagnosable instead of guessable.
    err.requiredScopes = data?.context?.requiredScopes || data?.context?.requiredGranularScopes || null;
    err.category = data?.category || null;
    err.endpoint = path;
    throw err;
  }
  return data;
}

/** Split "Ann Marie Ruiz" into first/last the same way enrichmentCsv does. */
function splitName(full) {
  const parts = str(full, 120).split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstname: parts[0] || "", lastname: "" };
  return { firstname: parts.slice(0, -1).join(" "), lastname: parts[parts.length - 1] };
}

const rawHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }
  const tenant = (body.tenant || "").replace(/[^a-z0-9-]/gi, "");
  if (!tenant) return json(400, { error: "Missing tenant" });

  const auth = requireWriteAuth(event, tenant);
  if (!auth.ok) {
    await logWrite(event, { fn: "crm-push", ok: false, status: auth.status });
    return jsonUnauthorized(auth);
  }

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return json(500, { error: "HUBSPOT_TOKEN not configured" });

  const commit = body.commit === true;
  const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, MAX_ROWS)
    // Only genuinely cleared rows: an email to key on and a name to write.
    .filter((r) => r && str(r.email, 160) && str(r.buyer, 120))
    .map((r) => ({
      companyId: str(String(r.companyId ?? ""), 32),
      companyName: str(r.companyName, 200),
      buyer: str(r.buyer, 120),
      title: str(r.title, 120),
      email: str(r.email, 160).toLowerCase(),
      phone: str(r.phone, 40),
      instagram: str(r.instagram, 120),
      note: str(r.note, 1000),
    }));

  if (!rows.length) return json(400, { error: "No cleared rows to push (each needs an email and a buyer name)" });

  const planned = [];
  const results = [];

  try {
    for (const r of rows) {
      // 1. Does this contact already exist? Email is the natural key, same as a CSV import.
      const found = await hs(token, "/crm/v3/objects/contacts/search", {
        method: "POST",
        body: {
          filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: r.email }] }],
          properties: ["email", "firstname", "lastname"],
          limit: 1,
        },
      });
      const existing = found?.results?.[0] || null;
      const { firstname, lastname } = splitName(r.buyer);
      const props = {
        email: r.email,
        firstname,
        ...(lastname ? { lastname } : {}),
        ...(r.title ? { jobtitle: r.title } : {}),
        ...(r.phone ? { phone: r.phone } : {}),
        ...(r.companyName ? { company: r.companyName } : {}),
      };

      const plan = {
        email: r.email,
        buyer: r.buyer,
        companyName: r.companyName,
        action: existing ? "update" : "create",
        contactId: existing?.id || null,
        associateCompanyId: r.companyId || null,
        // Instagram has no native HubSpot property; carried as a note rather than silently dropped.
        noteWillBeWritten: !!(r.note || r.instagram),
      };
      planned.push(plan);

      if (!commit) { await sleep(120); continue; }

      // 2. Create or update.
      let contactId = existing?.id || null;
      if (existing) {
        await hs(token, `/crm/v3/objects/contacts/${existing.id}`, { method: "PATCH", body: { properties: props } });
      } else {
        const created = await hs(token, "/crm/v3/objects/contacts", { method: "POST", body: { properties: props } });
        contactId = created?.id || null;
      }

      // 3. Associate to the company we already know the record id for — this is what stops the
      //    import creating a second, orphaned company.
      if (contactId && r.companyId) {
        try {
          await hs(token, `/crm/v4/objects/contacts/${contactId}/associations/default/companies/${r.companyId}`, { method: "PUT" });
        } catch (e) {
          plan.associationError = String(e.message || e);
        }
      }

      // 4. The call record itself, as a note on the contact. Keeps what was said attached to the
      //    person rather than living only in the platform.
      if (contactId && (r.note || r.instagram)) {
        const lines = [
          r.note ? `Call note: ${r.note}` : "",
          r.instagram ? `Instagram: ${r.instagram}` : "",
          "— captured in the CheeseShop TECH enrichment console",
        ].filter(Boolean).join("\n");
        try {
          await hs(token, "/crm/v3/objects/notes", {
            method: "POST",
            body: {
              properties: { hs_note_body: lines, hs_timestamp: new Date().toISOString() },
              associations: [{ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }],
            },
          });
        } catch (e) {
          plan.noteError = String(e.message || e);
        }
      }

      results.push({ email: r.email, action: plan.action, contactId });
      await sleep(260); // stay well under HubSpot's ~4 req/s search cap
    }
  } catch (err) {
    await logWrite(event, { fn: "crm-push", ok: false, tenant, status: err.status || 502 });
    // Report what HubSpot actually said, and WHICH call failed — a dry run only searches, so a
    // 403 there is a read-scope problem, while a 403 on commit is the write scope. Same sentence
    // from HubSpot, completely different fix.
    const scopes = err.requiredScopes;
    const hint = err.status === 403
      ? [
          scopes?.length ? `HubSpot requires: ${scopes.join(", ")}.` : null,
          `Failed on ${commit ? "the write" : "the lookup"} (${err.endpoint}).`,
          "Add the scope on the SAME private app whose token is in HUBSPOT_TOKEN, then Commit changes.",
        ].filter(Boolean).join(" ")
      : undefined;
    return json(err.status === 403 ? 403 : 502, {
      error: String(err.message || err),
      requiredScopes: scopes,
      category: err.category,
      failedOn: err.endpoint,
      phase: commit ? "commit" : "dry-run",
      hint,
      planned,
      results,
      partial: results.length > 0,
    });
  }

  if (commit) await logWrite(event, { fn: "crm-push", ok: true, tenant, role: auth.role, count: results.length });
  return json(200, { ok: true, dryRun: !commit, planned, results });
};

export const handler = withMonitoring("crm-push", rawHandler);
