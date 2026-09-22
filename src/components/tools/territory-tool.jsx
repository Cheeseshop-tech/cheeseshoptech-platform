// Territory Book — look up a territory, click through to its accounts, plan the visit.
// Decision record: docs/ADR-002_territory-as-first-class-entity_2026-09-22.md
//
// Rick, 2026-09-22: "we need to keep track of the territories for reporting we need the territory
// look up and click through to the accounts in the territory for customer visit planing."
//
// This is a STANDING tool, not a campaign panel, because a territory outlives every campaign that
// reads it — the whole point of ADR-002. The campaign side consumes the same book through
// scopeForRoster().
//
// Three modes, in the order the work actually happens:
//   Look up  — the daily use: find a territory, open it, work or print the account list.
//   Build    — the occasional use: create a territory, put reps and accounts in it.
//   Report   — the weekly use: coverage by territory and by state, and what is covered by nobody.

import { useEffect, useMemo, useRef, useState } from "react";
import { getCrmData, stateOf, addressOf, mapUrlOf, composeUrl } from "@/lib/crm.js";
import { cityKeyOf, downloadCsv } from "@/lib/campaigns.js";
import {
  getTerritoryBook, saveTerritoryBook, newTerritory, territoryList, accountsInTerritory,
  territoriesOfAccount, unassignedAccounts, newlyMatching, territoryReport, stateRollup,
} from "@/lib/territories.js";

// Scoped to .ter so it can't leak into the rest of the portal; all colour from the tenant's
// --cs-* vars, matching crm-page.jsx and booth-tool.jsx.
const CSS = `
.ter{max-width:1180px;margin:0 auto;color:var(--cs-color-fg);font-size:15px;line-height:1.45;}
.ter .hdr{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid var(--cs-color-brand-primary);padding-bottom:12px;}
.ter .hdr h1{font-size:20px;margin:0;color:var(--cs-color-brand-primary);font-weight:700;}
.ter .hdr .sub{font-size:13px;color:var(--cs-color-fg-muted);margin-top:2px;}
.ter .save{font-size:12px;color:var(--cs-color-fg-muted);white-space:nowrap;}
.ter .save.err{color:var(--cs-color-warning);font-weight:600;}
.ter .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0;}
.ter .kpi{background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:10px;padding:12px;}
.ter .kpi .n{font-size:26px;font-weight:700;color:var(--cs-color-brand-primary);line-height:1.1;}
.ter .kpi .l{font-size:11px;color:var(--cs-color-fg-muted);text-transform:uppercase;letter-spacing:.5px;margin-top:4px;}
.ter .kpi.warn .n{color:var(--cs-color-warning);}
.ter .modes{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 14px;}
.ter .mode{padding:8px 14px;border-radius:999px;border:1px solid var(--cs-color-border);background:var(--cs-color-bg);color:var(--cs-color-fg-muted);cursor:pointer;font-size:14px;}
.ter .mode.on{background:var(--cs-color-brand-primary);border-color:var(--cs-color-brand-primary);color:#fff;font-weight:600;}
.ter .cols{display:grid;grid-template-columns:320px 1fr;gap:18px;align-items:start;}
@media (max-width:860px){.ter .cols{grid-template-columns:1fr;}}
.ter .card{background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:10px;padding:14px;}
.ter .card h2{font-size:14px;margin:0 0 10px;color:var(--cs-color-brand-primary);text-transform:uppercase;letter-spacing:.5px;}
.ter input[type=text],.ter input[type=search],.ter select,.ter textarea{width:100%;padding:8px 10px;border:1px solid var(--cs-color-border);border-radius:7px;background:var(--cs-color-bg);color:var(--cs-color-fg);font:inherit;}
.ter .tlist{list-style:none;margin:0;padding:0;max-height:560px;overflow:auto;}
.ter .tlist li{border-bottom:1px solid var(--cs-color-border);}
.ter .tlist>li>button{display:block;width:100%;text-align:left;padding:10px 8px;background:none;border:0;cursor:pointer;color:inherit;font:inherit;}
.ter .tlist>li>button:hover{background:rgba(0,0,0,.035);}
.ter .tlist>li>button.on{background:var(--cs-color-brand-primary);color:#fff;}
.ter .tlist .nm{font-weight:600;}
.ter .tlist .mt{font-size:12px;opacity:.75;margin-top:2px;}
.ter .legacy{font-size:11px;border:1px dashed var(--cs-color-warning);color:var(--cs-color-warning);border-radius:4px;padding:0 5px;margin-left:6px;}
.ter table{width:100%;border-collapse:collapse;font-size:14px;}
.ter th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--cs-color-fg-muted);border-bottom:1px solid var(--cs-color-border);padding:6px 8px;}
.ter td{padding:8px;border-bottom:1px solid var(--cs-color-border);vertical-align:top;}
.ter td .nm{font-weight:600;}
.ter .mt{font-size:12px;color:var(--cs-color-fg-muted);}
.ter .btn{padding:7px 13px;border-radius:7px;border:1px solid var(--cs-color-brand-primary);background:var(--cs-color-brand-primary);color:#fff;cursor:pointer;font:inherit;font-size:14px;}
.ter .btn.ghost{background:none;color:var(--cs-color-brand-primary);}
.ter .btn.sm{padding:4px 9px;font-size:13px;}
.ter .btn:disabled{opacity:.45;cursor:not-allowed;}
.ter .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.ter .tree{max-height:320px;overflow:auto;border:1px solid var(--cs-color-border);border-radius:8px;padding:8px;}
.ter .tree .st{padding:3px 0;}
.ter .tree .cy{padding:2px 0 2px 24px;font-size:13px;}
.ter .tree label{display:flex;gap:7px;align-items:center;cursor:pointer;}
.ter .hint{font-size:12px;color:var(--cs-color-fg-muted);margin-top:6px;}
.ter .chip{display:inline-block;font-size:12px;border:1px solid var(--cs-color-border);border-radius:999px;padding:1px 9px;margin:2px 4px 2px 0;}
.ter .empty{padding:26px 10px;text-align:center;color:var(--cs-color-fg-muted);font-size:14px;}
@media print{
  .ter .modes,.ter .kpis,.ter .save,.ter .noprint{display:none!important;}
  .ter .cols{grid-template-columns:1fr;}
  .ter .card{border:0;padding:0;}
}
`;

const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * Flat state → city index for the "add accounts by area" picker.
 *
 * Deliberately NOT campaigns.js's geoBreakdown(): that returns region → state → city and splits
 * NY into Long Island / boroughs sub-nodes, which is right for a call-priority drill-down and
 * wrong here — this picker needs the plain state/city pair that membership is selected by.
 */
function stateCityIndex(companies) {
  const states = new Map();
  for (const co of companies) {
    const st = String(stateOf(co) || "").toUpperCase();
    if (!st) continue;
    if (!states.has(st)) states.set(st, { state: st, total: 0, cities: new Map() });
    const S = states.get(st);
    S.total += 1;
    const key = cityKeyOf(co) || "—";
    if (!S.cities.has(key)) {
      S.cities.set(key, { key, label: co.city ? String(co.city).trim() : "—", total: 0 });
    }
    S.cities.get(key).total += 1;
  }
  return [...states.values()]
    .map((s) => ({ ...s, cities: [...s.cities.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)) }))
    .sort((a, b) => b.total - a.total || a.state.localeCompare(b.state));
}

export function TerritoryTool({ resolved }) {
  const [crm, setCrm] = useState(undefined);
  const [book, setBook] = useState(null);          // null = still loading
  const [mode, setMode] = useState("lookup");
  const [openId, setOpenId] = useState("");
  const [q, setQ] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const timer = useRef(null);

  useEffect(() => {
    let alive = true;
    getCrmData(resolved).then((d) => alive && setCrm(d || null)).catch(() => alive && setCrm(null));
    getTerritoryBook(resolved).then((b) => alive && setBook(b || {})).catch(() => alive && setBook({}));
    return () => { alive = false; clearTimeout(timer.current); };
  }, [resolved.id]);

  // Memoized rather than `crm?.companies || []` inline: the fallback literal is a new array on
  // every render, which would re-run every derivation below even when nothing changed.
  const companies = useMemo(() => crm?.companies || [], [crm]);

  // Debounced autosave, same cadence as every other overlay editor in the portal. The book is
  // small enough to send whole — there is no partial-update path to get wrong.
  function persist(next) {
    setBook(next);
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { ok, status } = await saveTerritoryBook(resolved, next);
      setSaveState(ok ? "saved" : `Couldn't save${status ? ` (${status})` : ""}`);
    }, 700);
  }

  const list = useMemo(() => {
    const all = territoryList(book || {});
    const needle = norm(q);
    if (!needle) return all;
    return all.filter((t) => norm(t.name).includes(needle) || (t.repEmails || []).some((e) => norm(e).includes(needle)));
  }, [book, q]);

  const open = openId ? (book || {})[openId] : null;
  const openAccounts = useMemo(() => (open ? accountsInTerritory(open, companies) : []), [open, companies]);
  const unassigned = useMemo(() => unassignedAccounts(book || {}, companies), [book, companies]);

  const kpis = useMemo(() => {
    const ts = Object.values(book || {});
    const covered = new Set();
    for (const t of ts) for (const id of t.accountIds || []) covered.add(String(id));
    const reps = new Set();
    for (const t of ts) for (const e of t.repEmails || []) reps.add(e);
    return { territories: ts.length, covered: covered.size, reps: reps.size, unassigned: unassigned.length };
  }, [book, unassigned]);

  if (book === null || crm === undefined) {
    return <div className="ter"><style>{CSS}</style><div className="empty">Loading the territory book…</div></div>;
  }

  return (
    <div className="ter">
      <style>{CSS}</style>

      <div className="hdr">
        <div>
          <h1>{resolved.brand.name} — Territory Book</h1>
          <div className="sub">
            Look one up, open its accounts, plan the visit. Territories carry across every campaign.
          </div>
        </div>
        <div className={`save ${saveState.startsWith("Couldn't") ? "err" : ""}`}>
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "idle" ? "" : saveState}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="n">{kpis.territories}</div><div className="l">Territories</div></div>
        <div className="kpi"><div className="n">{kpis.covered}</div><div className="l">Accounts covered</div></div>
        <div className="kpi"><div className="n">{kpis.reps}</div><div className="l">Reps assigned</div></div>
        {/* The maintenance cost of explicit membership, kept in front of you rather than buried —
            ADR-002 accepted that cost only on condition this number stays visible. */}
        <div className={`kpi ${kpis.unassigned ? "warn" : ""}`}>
          <div className="n">{kpis.unassigned}</div><div className="l">In no territory</div>
        </div>
      </div>

      <div className="modes noprint">
        <button className={`mode ${mode === "lookup" ? "on" : ""}`} onClick={() => setMode("lookup")}>Look up &amp; visit</button>
        <button className={`mode ${mode === "build" ? "on" : ""}`} onClick={() => setMode("build")}>Build territories</button>
        <button className={`mode ${mode === "report" ? "on" : ""}`} onClick={() => setMode("report")}>Reporting</button>
      </div>

      {mode === "lookup" && (
        <LookupMode
          list={list} q={q} setQ={setQ} openId={openId} setOpenId={setOpenId}
          open={open} accounts={openAccounts} companies={companies} book={book}
          resolved={resolved}
          onAddMatching={(t, cos) => persist({
            ...book,
            [t.id]: { ...t, accountIds: [...new Set([...(t.accountIds || []), ...cos.map((c) => String(c.id))])] },
          })}
        />
      )}

      {mode === "build" && (
        <BuildMode
          book={book} companies={companies} people={crm?.people || []} persist={persist}
          openId={openId} setOpenId={setOpenId}
        />
      )}

      {mode === "report" && <ReportMode book={book} companies={companies} unassigned={unassigned} />}
    </div>
  );
}

// ---- Look up & visit -------------------------------------------------------------------------

function LookupMode({ list, q, setQ, openId, setOpenId, open, accounts, companies, book, resolved, onAddMatching }) {
  // The one place geometry is consulted, and only to OFFER: these accounts match the shape this
  // territory was built from but were never added. Nothing joins a territory on its own.
  const fresh = useMemo(() => (open ? newlyMatching(open, companies) : []), [open, companies]);

  function exportVisitList() {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Account", "Contact", "Email", "Address", "City", "State", "Phone", "Also in"].map(esc).join(","),
      ...accounts.map((co) => [
        co.name, co.owner, co.ownerEmail, addressOf(co), co.city, stateOf(co),
        co.phone || co.ownerPhone,
        territoriesOfAccount(book, co.id).filter((t) => t.id !== open.id).map((t) => t.name).join(" / "),
      ].map(esc).join(",")),
    ].join("\n");
    downloadCsv(`${open.name} — visit list.csv`, rows);
  }

  return (
    <div className="cols">
      <div className="card noprint">
        <h2>Territories</h2>
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Find a territory or a rep…" aria-label="Find a territory"
        />
        {list.length === 0 ? (
          <div className="empty">No territories yet — build one under “Build territories”.</div>
        ) : (
          <ul className="tlist" style={{ marginTop: 10 }}>
            {list.map((t) => (
              <li key={t.id}>
                <button className={t.id === openId ? "on" : ""} onClick={() => setOpenId(t.id)}>
                  <div className="nm">
                    {t.name}
                    {t.legacy && <span className="legacy">needs naming</span>}
                  </div>
                  <div className="mt">
                    {(t.accountIds || []).length} accounts
                    {(t.repEmails || []).length
                      ? ` · ${(t.repEmails || []).length} rep${(t.repEmails || []).length === 1 ? "" : "s"}`
                      : " · no rep yet"}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        {!open ? (
          <div className="empty">Pick a territory to see its accounts.</div>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>{open.name}</h2>
                <div className="mt">
                  {accounts.length} account{accounts.length === 1 ? "" : "s"}
                  {(open.repEmails || []).length ? ` · ${(open.repEmails || []).join(", ")}` : " · no rep assigned"}
                </div>
              </div>
              <div className="row noprint">
                <button className="btn ghost sm" onClick={() => window.print()}>Print visit list</button>
                <button className="btn ghost sm" onClick={exportVisitList} disabled={!accounts.length}>CSV</button>
              </div>
            </div>

            {fresh.length > 0 && (
              <div className="row noprint" style={{ marginBottom: 10 }}>
                <span className="hint" style={{ margin: 0 }}>
                  {fresh.length} new account{fresh.length === 1 ? "" : "s"} now match this territory’s shape.
                </span>
                <button className="btn sm" onClick={() => onAddMatching(open, fresh)}>Add them</button>
              </div>
            )}

            {accounts.length === 0 ? (
              <div className="empty">
                Nothing in this territory yet — a territory can exist before it has accounts.
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Account</th><th>Where</th><th>Phone</th><th className="noprint">Also in</th></tr>
                </thead>
                <tbody>
                  {accounts.map((co) => {
                    const also = territoriesOfAccount(book, co.id).filter((t) => t.id !== open.id);
                    return (
                      <tr key={co.id}>
                        <td>
                          <div className="nm">{co.name}</div>
                          {/* A company record carries no email of its own — crm-hubspot.js joins
                              the primary contact on as owner/ownerEmail/ownerPhone. Reading
                              co.email here would silently render nothing, every time. */}
                          {co.owner && <div className="mt">{co.owner}</div>}
                          {co.ownerEmail && (
                            <a className="mt" href={composeUrl({ calendar: resolved.calendar, to: co.ownerEmail })}
                               target="_blank" rel="noreferrer">{co.ownerEmail}</a>
                          )}
                        </td>
                        <td>
                          <div>{addressOf(co) || "—"}</div>
                          <div className="mt">
                            {[co.city, stateOf(co)].filter(Boolean).join(", ")}
                            {mapUrlOf(co) && (
                              <> · <a className="noprint" href={mapUrlOf(co)} target="_blank" rel="noreferrer">map</a></>
                            )}
                          </div>
                        </td>
                        <td>
                          {co.phone || co.ownerPhone
                            ? <a href={`tel:${co.phone || co.ownerPhone}`}>{co.phone || co.ownerPhone}</a>
                            : "—"}
                        </td>
                        <td className="noprint">
                          {also.length
                            ? also.map((t) => <span key={t.id} className="chip">{t.name}</span>)
                            : <span className="mt">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Build ------------------------------------------------------------------------------------

function BuildMode({ book, companies, people, persist, openId, setOpenId }) {
  const [name, setName] = useState("");
  const [checkedStates, setCheckedStates] = useState(() => new Set());
  const [checkedCities, setCheckedCities] = useState({});   // { ST: Set<cityKey> }
  const [expanded, setExpanded] = useState(() => new Set());

  const t = openId ? book[openId] : null;
  const geo = useMemo(() => stateCityIndex(companies), [companies]);

  function toggleState(st) {
    setCheckedStates((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st); else next.add(st);
      return next;
    });
  }
  function toggleCity(st, key) {
    setCheckedCities((prev) => {
      const cur = new Set(prev[st] || []);
      if (cur.has(key)) cur.delete(key); else cur.add(key);
      return { ...prev, [st]: cur };
    });
  }

  // Accounts currently matched by the checkboxes. A PREVIEW of what "Add" would write — the boxes
  // are never stored as a rule (ADR-002); only the accounts they select are.
  const matched = useMemo(() => companies.filter((co) => {
    const st = String(stateOf(co) || "").toUpperCase();
    if (!st) return false;
    const cities = checkedCities[st];
    if (cities?.size) return cities.has(cityKeyOf(co) || "—");
    return checkedStates.has(st);
  }), [companies, checkedStates, checkedCities]);

  const builtFrom = useMemo(() => {
    const states = [...checkedStates];
    const cities = Object.fromEntries(
      Object.entries(checkedCities).filter(([, s]) => s.size).map(([st, s]) => [st, [...s]])
    );
    if (!states.length && !Object.keys(cities).length) return null;
    return { ...(states.length ? { states } : {}), ...(Object.keys(cities).length ? { cities } : {}) };
  }, [checkedStates, checkedCities]);

  function create() {
    const nt = newTerritory(name);
    if (!nt.id || !nt.name) return;
    persist({ ...book, [nt.id]: nt });
    setOpenId(nt.id);
    setName("");
  }

  function addMatched() {
    if (!t) return;
    persist({
      ...book,
      [t.id]: {
        ...t,
        accountIds: [...new Set([...(t.accountIds || []), ...matched.map((c) => String(c.id))])],
        // Remember the shape so newlyMatching() can offer additions later. Provenance, not a rule.
        ...(builtFrom ? { builtFrom } : {}),
        legacy: undefined,
      },
    });
  }

  function toggleAccount(companyId) {
    if (!t) return;
    const id = String(companyId);
    const has = (t.accountIds || []).some((x) => String(x) === id);
    persist({
      ...book,
      [t.id]: {
        ...t,
        accountIds: has
          ? (t.accountIds || []).filter((x) => String(x) !== id)
          : [...(t.accountIds || []), id],
      },
    });
  }

  function toggleRep(email) {
    if (!t) return;
    const has = (t.repEmails || []).includes(email);
    persist({
      ...book,
      [t.id]: {
        ...t,
        repEmails: has ? (t.repEmails || []).filter((e) => e !== email) : [...(t.repEmails || []), email],
      },
    });
  }

  function rename(next) {
    if (!t) return;
    persist({ ...book, [t.id]: { ...t, name: next, legacy: undefined } });
  }

  function remove() {
    if (!t) return;
    const next = { ...book };
    delete next[t.id];
    persist(next);
    setOpenId("");
  }

  const repOptions = useMemo(() => {
    const seen = new Set();
    return (people || [])
      .filter((p) => {
        const k = norm(p.email);
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
  }, [people]);

  const inTerritory = useMemo(() => (t ? accountsInTerritory(t, companies) : []), [t, companies]);

  return (
    <div className="cols">
      <div className="card">
        <h2>Territories</h2>
        <div className="row">
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="New territory name…" aria-label="New territory name"
            onKeyDown={(e) => e.key === "Enter" && create()}
            style={{ flex: 1, minWidth: 140 }}
          />
          <button className="btn sm" onClick={create} disabled={!name.trim()}>Add</button>
        </div>
        <div className="hint">
          A territory can exist before it has any accounts — that’s how you plan a day you haven’t
          filled yet.
        </div>
        <ul className="tlist" style={{ marginTop: 10 }}>
          {territoryList(book).map((x) => (
            <li key={x.id}>
              <button className={x.id === openId ? "on" : ""} onClick={() => setOpenId(x.id)}>
                <div className="nm">{x.name}{x.legacy && <span className="legacy">needs naming</span>}</div>
                <div className="mt">{(x.accountIds || []).length} accounts</div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        {!t ? (
          <div className="empty">Pick or create a territory to build it.</div>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <input
                type="text" value={t.name} onChange={(e) => rename(e.target.value)}
                aria-label="Territory name" style={{ maxWidth: 380, fontWeight: 600 }}
              />
              <button className="btn ghost sm" onClick={remove}>Delete</button>
            </div>
            {t.legacy && (
              <div className="hint">
                Carried over from this campaign’s old per-rep assignments. Give it a real name and it
                becomes a proper territory — nothing is lost either way.
              </div>
            )}

            <h2 style={{ marginTop: 16 }}>Reps covering it</h2>
            <select
              aria-label="Add a rep" value=""
              onChange={(e) => e.target.value && toggleRep(e.target.value)}
              style={{ maxWidth: 360 }}
            >
              <option value="">Add a rep…</option>
              {repOptions
                .filter((p) => !(t.repEmails || []).includes(norm(p.email)))
                .map((p) => (
                  <option key={p.email} value={norm(p.email)}>
                    {p.name || p.email}{p.company ? ` — ${p.company}` : ""}
                  </option>
                ))}
            </select>
            <div style={{ marginTop: 6 }}>
              {(t.repEmails || []).length === 0
                ? <span className="hint">No rep yet — crossover is fine, you can add several.</span>
                : (t.repEmails || []).map((e) => (
                    <span key={e} className="chip">
                      {e}{" "}
                      <button
                        className="btn ghost sm" style={{ border: 0, padding: "0 2px" }}
                        onClick={() => toggleRep(e)} aria-label={`Remove ${e}`}
                      >×</button>
                    </span>
                  ))}
            </div>

            <h2 style={{ marginTop: 16 }}>Add accounts by area</h2>
            <div className="tree">
              {geo.map((s) => (
                <div key={s.state}>
                  <div className="st">
                    <label>
                      <input type="checkbox" checked={checkedStates.has(s.state)} onChange={() => toggleState(s.state)} />
                      <strong>{s.state}</strong>
                      <span className="mt">{s.total} accounts</span>
                      <button
                        type="button" className="btn ghost sm" style={{ border: 0, padding: "0 6px" }}
                        onClick={() => setExpanded((prev) => {
                          const n = new Set(prev);
                          if (n.has(s.state)) n.delete(s.state); else n.add(s.state);
                          return n;
                        })}
                      >{expanded.has(s.state) ? "hide towns" : "towns"}</button>
                    </label>
                  </div>
                  {expanded.has(s.state) && s.cities.map((c) => (
                    <div key={c.key} className="cy">
                      <label>
                        <input
                          type="checkbox"
                          checked={!!checkedCities[s.state]?.has(c.key)}
                          onChange={() => toggleCity(s.state, c.key)}
                        />
                        {c.label} <span className="mt">({c.total})</span>
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={addMatched} disabled={!matched.length}>
                Add {matched.length} matched account{matched.length === 1 ? "" : "s"}
              </button>
              <span className="hint" style={{ margin: 0, flex: 1, minWidth: 220 }}>
                Checking boxes doesn’t store a rule — it picks accounts to add. Membership stays
                explicit, so a scattered account can live here without dragging its neighbours in.
              </span>
            </div>

            <h2 style={{ marginTop: 18 }}>In this territory ({(t.accountIds || []).length})</h2>
            {inTerritory.length === 0 ? (
              <div className="empty">Nothing yet.</div>
            ) : (
              <table>
                <thead><tr><th>Account</th><th>Where</th><th /></tr></thead>
                <tbody>
                  {inTerritory.map((co) => (
                    <tr key={co.id}>
                      <td><div className="nm">{co.name}</div></td>
                      <td className="mt">{[co.city, stateOf(co)].filter(Boolean).join(", ")}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn ghost sm" onClick={() => toggleAccount(co.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Reporting ---------------------------------------------------------------------------------

function ReportMode({ book, companies, unassigned }) {
  const rows = useMemo(() => territoryReport(book, companies), [book, companies]);
  const byState = useMemo(() => stateRollup(book, companies), [book, companies]);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Coverage by territory</h2>
        {rows.length === 0 ? <div className="empty">No territories yet.</div> : (
          <table>
            <thead><tr><th>Territory</th><th>Accounts</th><th>States</th><th>Reps</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><div className="nm">{r.name}</div></td>
                  <td>
                    {r.accounts}
                    {/* An id whose company is gone from HubSpot — stale membership, worth seeing. */}
                    {r.missing > 0 && <span className="mt"> · {r.missing} missing</span>}
                  </td>
                  <td className="mt">{r.states.join(", ") || "—"}</td>
                  <td className="mt">{r.reps.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="cols">
        <div className="card">
          <h2>Accounts by state</h2>
          {byState.length === 0 ? <div className="empty">Nothing covered yet.</div> : (
            <table>
              <thead><tr><th>State</th><th>Accounts</th></tr></thead>
              <tbody>
                {byState.map((r) => <tr key={r.state}><td>{r.state}</td><td>{r.accounts}</td></tr>)}
              </tbody>
            </table>
          )}
          <div className="hint">An account in two territories is counted once here.</div>
        </div>

        <div className="card">
          <h2>In no territory ({unassigned.length})</h2>
          {unassigned.length === 0 ? (
            <div className="empty">Every account is covered.</div>
          ) : (
            <>
              <div className="hint" style={{ marginTop: 0, marginBottom: 8 }}>
                Explicit membership means a new account belongs to nobody until you put it somewhere.
                This list is that cost, made visible.
              </div>
              <table>
                <thead><tr><th>Account</th><th>Where</th></tr></thead>
                <tbody>
                  {unassigned.slice(0, 200).map((co) => (
                    <tr key={co.id}>
                      <td><div className="nm">{co.name}</div></td>
                      <td className="mt">{[co.city, stateOf(co)].filter(Boolean).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {unassigned.length > 200 && <div className="hint">…and {unassigned.length - 200} more.</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
