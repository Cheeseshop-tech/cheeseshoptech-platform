// Movement history seam — the shared record of sold/missed cases that feeds forecasting.
// localStorage is the instant, offline-safe layer; when VITE_PRICING_BACKEND=function the records
// also sync to the central store (/.netlify/functions/history) so every rep shares one history
// (one mind / one body). Same key as the legacy ledger so prior captures carry over.
import { PRICING_BACKEND } from "@/lib/pricing.js";
import { writeAuthHeader } from "@/lib/auth-context.jsx";

const LS_KEY = "mt-movement-ledger";
const newId = () => Date.now() + "-" + Math.random().toString(36).slice(2, 8);

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function saveLocal(recs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(recs)); } catch { /* quota */ }
}

/** Append movement records. Stamps each with an id, writes locally immediately (optimistic), and
 *  best-effort POSTs to the central store when the live backend is on. Returns the stamped records. */
export function appendHistory(tenantId, records) {
  const stamped = (records || []).map((r) => ({ id: newId(), ...r }));
  saveLocal(loadLocal().concat(stamped));
  if (PRICING_BACKEND !== "mock" && stamped.length) {
    // Passcode header required server-side since 2026-07-16 (any tier — reps included). A 401
    // (pre-update unlock) means the record stays local-only until the rep signs out/in.
    fetch("/.netlify/functions/history", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...writeAuthHeader() },
      body: JSON.stringify({ tenant: tenantId, records: stamped }),
    }).catch(() => { /* offline — stays in localStorage, syncs implicitly next capture */ });
  }
  return stamped;
}

/** Load movement history: the shared store (source of truth) merged with any local-only records,
 *  deduped by id. Falls back to localStorage when the backend is mock or the network is down. */
export async function loadHistory(tenantId) {
  const local = loadLocal();
  if (PRICING_BACKEND === "mock") return local;
  try {
    const res = await fetch(`/.netlify/functions/history?tenant=${encodeURIComponent(tenantId)}`, {
      headers: { ...writeAuthHeader() },
    });
    if (!res.ok) return local; // incl. 401 from a pre-update unlock — local ledger still shows
    const data = await res.json();
    const remote = Array.isArray(data.records) ? data.records : [];
    const seen = new Set(remote.map((r) => r.id));
    return remote.concat(local.filter((r) => r.id && !seen.has(r.id)));
  } catch {
    return local;
  }
}
