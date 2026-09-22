// Territory book — the read/derive layer over netlify/functions/territory-book.js.
// Decision record: docs/ADR-002_territory-as-first-class-entity_2026-09-22.md
//
// A Territory is a NAMED SET with an id: { id, name, repEmails[], accountIds[], builtFrom }.
// Membership is explicit. Everything else is derived from it, here, and nowhere else:
//
//   rep     → accounts   union of accountIds over territories the rep covers
//   account → reps       union of repEmails over territories containing the account
//
// Deriving both directions from one object is the whole point. The previous model stored a flat
// account→reps map with no id and no name, which meant a territory could not be reported on,
// looked up, or clicked into — it only existed as checkbox state that was thrown away. It also
// meant there was a second map that could drift. There is now exactly one.
//
// `builtFrom` is PROVENANCE, never authority: it remembers which state/city boxes produced a
// membership so newlyMatching() can OFFER newly-matching accounts. A rule is never re-evaluated
// behind your back, because a rule cannot express the scattered account that lives in a
// neighbour's territory — the defect that killed the rule-based model on 2026-09-21.

import { readAuthedJson, writeAuthedJson } from "./authed-fetch.js";
import { stateOf } from "./crm.js";

// ---- Store ---------------------------------------------------------------------------------

export async function getTerritoryBook(resolved) {
  const res = await readAuthedJson(`/.netlify/functions/territory-book?tenant=${encodeURIComponent(resolved.id)}`);
  return res?.territories || {};
}

export async function saveTerritoryBook(resolved, territories) {
  const { ok, status } = await writeAuthedJson("/.netlify/functions/territory-book", {
    body: { tenant: resolved.id, territories },
  });
  return { ok, status };
}

// ---- Identity ------------------------------------------------------------------------------

/** Same normalization the function applies, so a client-made id round-trips unchanged. */
export const territoryId = (name) =>
  String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

/** A new, empty territory. It can exist before it has a single account — that is deliberate:
 *  planning a visit day starts with an empty day you fill, which is exactly what a bare
 *  `territoryName` string on an account could never represent. */
export function newTerritory(name, { repEmails = [], accountIds = [], builtFrom = null } = {}) {
  const now = new Date().toISOString();
  const id = territoryId(name);
  return {
    id,
    name: String(name || "").trim().slice(0, 120),
    repEmails: [...new Set(repEmails.map((e) => String(e || "").toLowerCase()).filter(Boolean))],
    accountIds: [...new Set(accountIds.map(String).filter(Boolean))],
    ...(builtFrom ? { builtFrom } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

const idsOf = (t) => t?.accountIds || [];
const repsOf = (t) => t?.repEmails || [];
const lower = (e) => String(e || "").trim().toLowerCase();

/** Territories as a sorted array — the order every list in the UI uses. */
export function territoryList(book) {
  return Object.values(book || {}).sort((a, b) => a.name.localeCompare(b.name));
}

// ---- Derivations ---------------------------------------------------------------------------
// All memo-friendly pure functions over the book. At ADR-002's stated scale (20-40 territories,
// <=5,000 accounts) these are linear scans on purpose — no index, no cache. Revisit past ~500
// territories, not before.

/** The accounts in one territory, as live CRM company records (ids that no longer exist in
 *  HubSpot are dropped rather than rendered as ghosts). */
export function accountsInTerritory(territory, companies = []) {
  const ids = new Set(idsOf(territory).map(String));
  if (!ids.size) return [];
  return companies.filter((co) => ids.has(String(co.id)));
}

/** Every territory this rep covers. */
export function territoriesOfRep(book, email) {
  const key = lower(email);
  if (!key) return [];
  return territoryList(book).filter((t) => repsOf(t).includes(key));
}

/** Every account id this rep covers, across all their territories. A scattered account inside
 *  another rep's ground is included here because it was added to one of THIS rep's territories —
 *  no exception table needed. */
export function accountIdsOfRep(book, email) {
  const out = new Set();
  for (const t of territoriesOfRep(book, email)) for (const id of idsOf(t)) out.add(String(id));
  return [...out];
}

/** Every rep on an account — the union across territories that contain it. This is what renders
 *  the "· also: [other reps]" line, and it is derived now rather than stored. */
export function repsOnAccount(book, companyId) {
  const id = String(companyId);
  const out = new Set();
  for (const t of Object.values(book || {})) {
    if (idsOf(t).some((x) => String(x) === id)) for (const e of repsOf(t)) out.add(e);
  }
  return [...out];
}

/** Every territory an account belongs to (it can be more than one — that IS the scattered case). */
export function territoriesOfAccount(book, companyId) {
  const id = String(companyId);
  return territoryList(book).filter((t) => idsOf(t).some((x) => String(x) === id));
}

/**
 * Accounts in no territory at all.
 *
 * This is the maintenance cost of explicit membership, made visible. ADR-002 accepted that cost
 * on the grounds that a mis-assigned account sends a rep to the wrong door — but an unassigned
 * account is just as bad if nobody can see it, so this is part of the build, not a nice-to-have.
 */
export function unassignedAccounts(book, companies = []) {
  const claimed = new Set();
  for (const t of Object.values(book || {})) for (const id of idsOf(t)) claimed.add(String(id));
  return companies.filter((co) => !claimed.has(String(co.id)));
}

/**
 * Accounts that NOW match a territory's `builtFrom` shape but aren't members yet.
 *
 * The one place geometry is consulted, and it only ever produces a SUGGESTION — the caller adds
 * them explicitly or ignores them. This is what keeps an explicit list from going stale as new
 * accounts land in HubSpot, without letting a rule silently overrule a decision made by hand.
 */
export function newlyMatching(territory, companies = []) {
  const bf = territory?.builtFrom;
  if (!bf) return [];
  const already = new Set(idsOf(territory).map(String));
  const states = new Set((bf.states || []).map((s) => s.toUpperCase()));
  const cities = bf.cities || {};
  return companies.filter((co) => {
    if (already.has(String(co.id))) return false;
    const st = String(stateOf(co) || "").toUpperCase();
    if (!st) return false;
    const narrowed = cities[st];
    // A state listed with city narrowing matches only those cities; listed bare, it matches whole.
    if (narrowed?.length) return narrowed.includes(String(co.city || "").trim().toLowerCase());
    return states.has(st);
  });
}

// ---- Reporting ------------------------------------------------------------------------------

/**
 * One row per territory: accounts, reps, and the state spread.
 *
 * No hierarchy is stored on a territory on purpose — every account already carries its own
 * state, so a state rollup is derived here and can never drift from the accounts it describes.
 */
export function territoryReport(book, companies = []) {
  const byId = new Map(companies.map((co) => [String(co.id), co]));
  return territoryList(book).map((t) => {
    const accounts = idsOf(t).map((id) => byId.get(String(id))).filter(Boolean);
    const states = [...new Set(accounts.map((co) => stateOf(co)).filter(Boolean))].sort();
    return {
      id: t.id,
      name: t.name,
      reps: repsOf(t),
      accounts: accounts.length,
      // An id in the list with no live company behind it — stale membership worth surfacing.
      missing: idsOf(t).length - accounts.length,
      states,
    };
  });
}

/** Accounts per state across the whole book — the cross-territory rollup. */
export function stateRollup(book, companies = []) {
  const byId = new Map(companies.map((co) => [String(co.id), co]));
  const counts = new Map();
  const seen = new Set();
  for (const t of Object.values(book || {})) {
    for (const id of idsOf(t)) {
      if (seen.has(String(id))) continue; // an account in two territories counts once
      seen.add(String(id));
      const st = stateOf(byId.get(String(id))) || "—";
      counts.set(st, (counts.get(st) || 0) + 1);
    }
  }
  return [...counts.entries()].map(([state, accounts]) => ({ state, accounts }))
    .sort((a, b) => b.accounts - a.accounts || a.state.localeCompare(b.state));
}

// ---- Migration ------------------------------------------------------------------------------

/**
 * Present a campaign's legacy `repVisits.accountAssignments` ({companyId: [repEmail]}) AS
 * territories, so nothing saved before ADR-002 is lost and nothing has to be converted.
 *
 * One synthetic territory per rep, named "<email> — unsorted", marked `legacy: true` so the UI
 * can show it as "needs naming" rather than pretending it is a real territory. Reads merge this
 * UNDER the real book (a real territory always wins); writes only ever go to the real book, so
 * the first time you touch anything it migrates itself.
 */
export function territoriesFromLegacy(accountAssignments) {
  const byRep = new Map();
  for (const [companyId, val] of Object.entries(accountAssignments || {})) {
    const emails = Array.isArray(val) ? val : [val];
    for (const raw of emails) {
      const email = lower(raw);
      if (!email) continue;
      if (!byRep.has(email)) byRep.set(email, []);
      byRep.get(email).push(String(companyId));
    }
  }
  const out = {};
  for (const [email, ids] of byRep) {
    const id = `legacy-${territoryId(email)}`;
    out[id] = { id, name: `${email} — unsorted`, repEmails: [email], accountIds: ids, legacy: true };
  }
  return out;
}

/** The book the UI reads: real territories win, legacy ones fill the gaps. */
export function mergeLegacy(book, accountAssignments) {
  const legacy = territoriesFromLegacy(accountAssignments);
  return { ...legacy, ...(book || {}) };
}

// ---- Campaign scope --------------------------------------------------------------------------

/**
 * The account ids a campaign should target: everything covered by the reps on its roster.
 *
 * This is what makes a TENANT-WIDE book safe to share. Without the roster filter, every rep's
 * accounts would bleed into every campaign's Target Prospects; with it, the book accumulates
 * across campaigns while each campaign stays scoped to who it is actually working.
 * Returns null (not []) when nothing is scoped, so mergeCampaign() leaves the campaign's own
 * audience alone rather than narrowing it to nothing.
 */
export function scopeForRoster(book, rosterEmails = []) {
  const roster = new Set(rosterEmails.map(lower).filter(Boolean));
  if (!roster.size) return null;
  const ids = new Set();
  for (const t of Object.values(book || {})) {
    if (!repsOf(t).some((e) => roster.has(e))) continue;
    for (const id of idsOf(t)) ids.add(String(id));
  }
  return ids.size ? [...ids] : null;
}
