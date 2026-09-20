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
