// Attention data layer — the dashboard "Priority — response needed" window. An attention item is
// anything that must be handled TODAY: an email awaiting a reply, a task at its deadline, a
// commitment about to lapse.
//
// Wired live 2026-09-19: a Gmail-driven priority-response routine writes items through
// /.netlify/functions/attention-publish (Netlify Blobs — same "Priority - Response Needed" Gmail
// label the routine also applies), and this reads them back through
// /.netlify/functions/attention-list — same no-rebuild path market-news/inventory use. Gated by
// VITE_ATTENTION_BACKEND=mock|function. The bundled JSON stays as the offline/empty fallback, and
// "is this sample data?" is decided per fetch (like market-news), not just by the build flag —
// an empty live store still falls back to bundled sample rather than showing a blank card.

import { authHeaders } from "@/lib/auth-context.jsx";
import { readAuthedJson, writeAuthedJson } from "@/lib/authed-fetch.js";
import mtAttention from "@/data/montitrentini/attention.json";
import demoAttention from "@/data/demo/attention.json";

const BUNDLES = {
  montitrentini: mtAttention,
  demo: demoAttention,
};

const ATTENTION_BACKEND = import.meta.env.VITE_ATTENTION_BACKEND || "mock";

// kind -> display label. "email" items are the "Priority response needed" rows.
export const ATTENTION_KINDS = {
  email: "Email · response needed",
  task: "Task",
  commitment: "Commitment",
};

const rank = (u) => (u === "urgent" ? 0 : u === "high" ? 1 : 2);
const byUrgency = (items) =>
  [...items].sort((a, b) => rank(a.urgency) - rank(b.urgency) || String(a.due || "").localeCompare(String(b.due || "")));

/**
 * Attention items for a tenant, most urgent first (urgent > high, then oldest deadline).
 *
 * Returns an envelope, not a bare array, because "is this sample data?" is a RUNTIME fact now,
 * not a build flag: with the backend set to "function" the list is still sample until the
 * routine has actually published one (or if the live list happens to be empty). Deciding it per
 * fetch — same approach as getMarketNews() — is what stops the card showing a false "live" over
 * bundled sample rows.
 *
 * @returns {Promise<{items: Array, isSample: boolean, updatedAt: string|null}>}
 */
export async function getAttention(resolved) {
  const bundled = BUNDLES[resolved?.id] || [];
  const sample = { items: byUrgency(bundled), isSample: true, updatedAt: null };

  if (ATTENTION_BACKEND === "mock") return sample;

  try {
    // Reads require portal auth server-side — replay the session/unlock header, same as market-news.
    // A 401 or an empty store lands on the bundled sample below rather than an empty card.
    const res = await fetch(`/.netlify/functions/attention-list?tenant=${encodeURIComponent(resolved.id)}`,
      { headers: { Accept: "application/json", ...(await authHeaders()) } });
    if (!res.ok) return sample;
    const data = await res.json();
    if (!Array.isArray(data?.items)) return sample;
    // An empty live-published list IS meaningful (desk is clear) — only fall back to sample when
    // there's genuinely no live data yet (source: "none"/"error"), not just when it's empty.
    if (data.items.length === 0 && data.source !== "blobs") return sample;
    return { items: byUrgency(data.items), isSample: false, updatedAt: data.updatedAt || null };
  } catch {
    return sample;
  }
}

// ---- Manual resolutions ("resolved on a call, log it") --------------------------------------
// Separate seam from getAttention()/publish above on purpose: those are the Gmail-driven
// automation's view of what's outstanding, refreshed wholesale every Monday. This is Rick's own
// manual override for the gap that automation can't see — a phone call, a hallway conversation —
// so an item can be cleared off the live card by hand, with a note, without waiting for (or
// depending on) next Monday's refresh. See netlify/functions/attention-resolutions.js.

export const RESOLUTION_METHODS = [
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "in-person", label: "In person" },
  { value: "other", label: "Other" },
];

const EMPTY_RESOLUTIONS = { resolved: {}, log: [], updatedAt: null };

/** Current resolved-suppress map + the full resolution log for a tenant. Never throws. */
export async function getAttentionResolutions(resolved) {
  const data = await readAuthedJson(
    `/.netlify/functions/attention-resolutions?tenant=${encodeURIComponent(resolved.id)}`,
    { onFail: null }
  );
  if (!data || typeof data !== "object") return EMPTY_RESOLUTIONS;
  return { resolved: data.resolved || {}, log: data.log || [], updatedAt: data.updatedAt || null };
}

/**
 * Mark one attention item resolved outside the automation (a call, in person, etc.), with an
 * optional note. Clears it off the live card immediately (caller should drop it from local state
 * on success) and appends one entry to the resolution log for later lookback.
 * @returns {Promise<{ok:boolean,status:number}>}
 */
export async function resolveAttentionItem(resolved, item, { notes = "", method = "other" } = {}) {
  return writeAuthedJson("/.netlify/functions/attention-resolutions", {
    body: {
      tenant: resolved.id,
      action: "resolve",
      id: item.id,
      who: item.who,
      what: item.what,
      urgency: item.urgency,
      notes,
      method,
    },
  });
}

/** Undo a resolve (e.g. clicked by mistake) — brings the item back onto the live card. */
export async function reopenAttentionItem(resolved, id) {
  return writeAuthedJson("/.netlify/functions/attention-resolutions", {
    body: { tenant: resolved.id, action: "reopen", id },
  });
}
