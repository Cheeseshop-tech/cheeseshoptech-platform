// Attention data layer — the dashboard "Priority — response needed" window. An attention item is
// anything that must be handled TODAY: an email awaiting a reply, a task at its deadline, a
// commitment about to lapse. Mock now (bundled sample); the getAttention() seam swaps to a real
// feed behind VITE_ATTENTION_BACKEND — the planned live source is a Netlify function reading the
// sales mailbox (flagged/unreplied threads) + task list. Same additive pattern as CRM/Signals/News.

import mtAttention from "@/data/montitrentini/attention.json";

const BUNDLES = {
  montitrentini: mtAttention,
};

const USE_MOCK = (import.meta.env.VITE_ATTENTION_BACKEND || "mock") === "mock";
// True while the window is on sample data (no live mailbox/task source). UI shows a "Sample" chip.
export const attentionIsSample = USE_MOCK;

// kind -> display label. "email" items are the "Priority response needed" rows.
export const ATTENTION_KINDS = {
  email: "Email · response needed",
  task: "Task",
  commitment: "Commitment",
};

/** Attention items for a tenant, most urgent first (urgent > high, then oldest deadline). */
export async function getAttention(resolved) {
  let items;
  if (USE_MOCK) {
    items = BUNDLES[resolved?.id] || [];
  } else {
    const res = await fetch(`/.netlify/functions/attention-list?tenant=${encodeURIComponent(resolved.id)}`);
    items = res.ok ? await res.json() : [];
  }
  const rank = (u) => (u === "urgent" ? 0 : u === "high" ? 1 : 2);
  return [...items].sort((a, b) => rank(a.urgency) - rank(b.urgency) || String(a.due || "").localeCompare(String(b.due || "")));
}
