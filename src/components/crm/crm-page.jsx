import { useEffect, useMemo, useRef, useState } from "react";
import { getCrmData, getOutreach, saveOutreach, OUTREACH_STAGES, FUNNEL_STAGES, regionOf, stateOf, crmIsSample, addressOf, mapUrlOf, websiteUrlOf } from "@/lib/crm.js";

// CRM page — THE OUTREACH CONSOLE, cloned 1:1 from the campaign-CRM artifact
// (Prospecting Phase 10, `MontiTrentini_Campaign_CRM.html`). The artifact's faceplate is kept
// verbatim — its stylesheet (below, scoped under .crmc and remapped onto the tenant's --cs-*
// theme vars) and its exact structure: header → 6 KPIs → stage bars → controls → responses →
// dense 8-column table → footer. Only the wiring behind the panel changed:
//   · Accounts + primary contacts: LIVE HubSpot, read-only (crm-hubspot.js — CRM of record).
//   · Status / notes / last-reply: platform-owned circuit through crm-outreach.js → Netlify
//     Blobs per tenant (replaces the artifact's localStorage — shared, survives any browser).
//   · Artifact-runtime circuits NOT yet landed server-side: Gmail sync + Claude draft creation.
//     The ✉ action is a plain mailto: until a server-side Gmail line exists.
// No per-client code — brand color arrives via the tenant theme vars, data via the resolver.
// 25 rows per page (2026-07-24) — each row renders a select + textarea, so windowing the table
// is what keeps paint fast; the full account book stays loaded for search/filters/KPIs.
const PAGE_SIZE = 25;

const CSS = `
.crmc{max-width:1180px;margin:0 auto;font-size:14px;line-height:1.45;color:var(--cs-color-fg);}
.crmc .hdr{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid var(--cs-color-brand-primary);padding-bottom:12px;}
.crmc .hdr h1{font-size:18px;margin:0;color:var(--cs-color-brand-primary);font-weight:700;letter-spacing:.2px;}
.crmc .hdr .sub{font-size:12px;color:var(--cs-color-fg-muted);}
.crmc .acct{font-size:12px;color:var(--cs-color-fg-muted);background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:6px;padding:5px 9px;}
.crmc .acct.live{color:var(--cs-color-success);border-color:var(--cs-color-success);}
.crmc .acct.warn{color:var(--cs-color-warning);}
.crmc .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:16px 0;}
.crmc .kpi{background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:10px;padding:12px;}
.crmc .kpi .n{font-size:24px;font-weight:700;color:var(--cs-color-brand-primary);}
.crmc .kpi .l{font-size:11px;color:var(--cs-color-fg-muted);text-transform:uppercase;letter-spacing:.5px;margin-top:2px;}
.crmc .kpi.gold .n{color:var(--cs-color-brand-accent);}
.crmc .bar-wrap{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 16px;}
.crmc .stage{flex:1;min-width:110px;background:var(--cs-color-surface);border:1px solid var(--cs-color-border);border-radius:8px;padding:8px 10px;cursor:pointer;text-align:left;}
.crmc .stage.on{border-color:var(--cs-color-brand-primary);box-shadow:inset 0 0 0 1px var(--cs-color-brand-primary);}
.crmc .stage .sn{font-size:18px;font-weight:700;}
.crmc .stage .sl{font-size:11px;color:var(--cs-color-fg-muted);}
.crmc .stage .track{height:5px;background:var(--cs-color-border);border-radius:3px;margin-top:6px;overflow:hidden;}
.crmc .stage .fill{height:100%;background:var(--cs-color-brand-primary);}
.crmc .controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0;}
.crmc input,.crmc select,.crmc textarea{font-family:inherit;font-size:13px;border:1px solid var(--cs-color-border);border-radius:6px;padding:7px 9px;background:var(--cs-color-surface);color:var(--cs-color-fg);}
.crmc input:focus,.crmc select:focus,.crmc textarea:focus{outline:none;border-color:var(--cs-color-brand-primary);}
.crmc .btn{background:var(--cs-color-brand-primary);color:var(--cs-color-on-primary);border:none;border-radius:6px;padding:8px 14px;font-weight:600;cursor:pointer;font-size:13px;}
.crmc .btn:hover{opacity:.9;}
.crmc .btn.ghost{background:var(--cs-color-surface);color:var(--cs-color-brand-primary);border:1px solid var(--cs-color-brand-primary);}
.crmc .search{flex:1;min-width:180px;}
.crmc table{width:100%;border-collapse:collapse;margin-top:8px;}
.crmc th,.crmc td{text-align:left;padding:8px 9px;border-bottom:1px solid var(--cs-color-border);vertical-align:top;font-size:13px;}
.crmc th{font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--cs-color-fg-muted);cursor:pointer;white-space:nowrap;}
.crmc tr:hover td{background:var(--cs-color-bg);}
.crmc .shop{font-weight:600;color:var(--cs-color-brand-primary);}
.crmc .muted{color:var(--cs-color-fg-muted);font-size:12px;}
.crmc .pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:20px;border:1px solid var(--cs-color-border);white-space:nowrap;}
.crmc a{color:var(--cs-color-brand-primary);text-decoration:none;}
.crmc a:hover{text-decoration:underline;}
.crmc .status-sel{font-size:12px;padding:4px 6px;border-radius:6px;}
.crmc .s-New{background:var(--cs-color-surface);}
.crmc .s-Emailed{background:#eef3ff;border-color:#c3d4ff;}
.crmc .s-Replied{background:#fff6e0;border-color:#f0d68a;}
.crmc .s-Meeting{background:#e9f6ee;border-color:#bfe3cd;}
.crmc .s-Won{background:#e3f6e9;border-color:#9ed8b3;color:var(--cs-color-success);font-weight:600;}
.crmc .s-Lost,.crmc .s-Notafit{background:#fdecea;border-color:#f0c2b6;color:var(--cs-color-error);}
.crmc .note{width:100%;min-height:30px;font-size:12px;resize:vertical;}
.crmc .resp{background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:10px;padding:12px;margin:14px 0;}
.crmc .resp h3{margin:0 0 8px;font-size:14px;color:var(--cs-color-brand-primary);}
.crmc .ritem{background:var(--cs-color-surface);border:1px solid var(--cs-color-border);border-radius:8px;padding:9px 11px;margin-bottom:8px;}
.crmc .ritem .rf{font-weight:600;font-size:13px;}
.crmc .ritem .rs{font-size:12px;color:var(--cs-color-fg-muted);margin-top:2px;}
.crmc .tag{font-size:10px;padding:1px 6px;border-radius:10px;background:var(--cs-color-brand-accent);color:var(--cs-color-on-accent);margin-left:6px;}
.crmc .foot{font-size:11px;color:var(--cs-color-fg-muted);margin-top:18px;border-top:1px solid var(--cs-color-border);padding-top:10px;}
.crmc .cell-actions a{display:inline-block;margin-right:8px;font-size:12px;white-space:nowrap;}
.crmc .pager{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px;}
.crmc .pager .btn:disabled{opacity:.4;cursor:default;}
@media(max-width:820px){.crmc .kpis{grid-template-columns:repeat(3,1fr);}}
.crmc .lnk{background:none;border:none;padding:0;font:inherit;color:var(--cs-color-brand-primary);cursor:pointer;font-size:12px;}
.crmc .lnk:hover{text-decoration:underline;}
.crmc-back{position:fixed;inset:0;background:rgba(20,20,15,.5);display:flex;align-items:flex-start;justify-content:center;z-index:60;padding:16px;overflow-y:auto;}
.crmc-sheet{background:var(--cs-color-surface);border-radius:14px;padding:20px;width:100%;max-width:520px;margin:auto;color:var(--cs-color-fg);}
.crmc-sheet .pc-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;border-bottom:2px solid var(--cs-color-brand-primary);padding-bottom:10px;margin-bottom:12px;}
.crmc-sheet .pc-hdr h2{margin:0;font-size:18px;color:var(--cs-color-brand-primary);}
.crmc-sheet .pc-sub{font-size:12px;color:var(--cs-color-fg-muted);margin-top:2px;}
.crmc-sheet .pc-x{background:none;border:none;font-size:18px;cursor:pointer;color:var(--cs-color-fg-muted);line-height:1;padding:2px 4px;}
.crmc-sheet .pc-row{display:grid;grid-template-columns:90px 1fr;gap:10px;padding:8px 0;border-bottom:1px solid var(--cs-color-border);align-items:start;}
.crmc-sheet .pc-l{font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--cs-color-fg-muted);padding-top:2px;}
.crmc-sheet .pc-v{font-size:14px;}
.crmc-sheet .pc-v a{display:inline-block;}
.crmc-sheet .pc-v .note{width:100%;min-height:56px;}
.crmc-sheet .pc-activity{margin-top:10px;background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:8px;padding:10px 12px;}
.crmc-sheet .pc-act-item{font-size:12.5px;margin-top:4px;}
.crmc-sheet .pc-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;}
.crmc-sheet .pc-acts .btn{text-decoration:none;display:inline-flex;align-items:center;}
`;

const statusClass = (s) => "status-sel s-" + String(s).replace(/[^A-Za-z]/g, "").replace(/^Nota/, "Nota");

export function CrmPage({ resolved, onNavigate }) {
  const [state, setState] = useState("loading"); // "loading" | "error" | "ok"
  const [data, setData] = useState(null);
  const [entries, setEntries] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [q, setQ] = useState("");
  const [fRegion, setFRegion] = useState("");
  const [fState, setFState] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [sort, setSort] = useState({ k: "name", dir: 1 });
  const [page, setPage] = useState(0);
  const [lookup, setLookup] = useState(null); // company id open in the prospect quick-look card, or null
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    let alive = true;
    Promise.all([getCrmData(resolved), getOutreach(resolved)])
      .then(([crm, outreach]) => {
        if (!alive) return;
        // CRM-05 follow-up: getOutreach() now resolves null on a failed read (was a fake
        // {entries:{}}) — treat that the same as a failed crm-hubspot read. Starting the editable
        // table from a blank overlay would let a subsequent autosave (last-writer-wins) silently
        // overwrite real saved status/notes with nothing but the new edit.
        if (!crm || !outreach) { setState("error"); return; }
        setData(crm); setEntries(outreach.entries || {}); setState("ok");
      })
      .catch(() => alive && setState("error"));
    return () => { alive = false; };
  }, [resolved.id]);

  const companies = data?.companies || [];
  const entryOf = (id) => entries[id] || {};
  const statusOf = (id) => entryOf(id).status || "New";

  // Region + state option lists WITH account counts — every dropdown choice shows its total,
  // so each query has its counter before you even run it (2026-07-24 request).
  const regions = useMemo(() => {
    const m = new Map();
    for (const c of companies) { const r = regionOf(c); if (r !== "—") m.set(r, (m.get(r) || 0) + 1); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [companies]);
  const states = useMemo(() => {
    const m = new Map();
    for (const c of companies) { const s = stateOf(c); if (s.length === 2) m.set(s, (m.get(s) || 0) + 1); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [companies]);

  // KPIs + funnel (artifact formulas: emailed = progressed past New incl. Lost/Not a fit;
  // replied = Replied/Meeting/Won; funnel bars = forward path only, scaled to the max stage).
  const kpi = useMemo(() => {
    let emailed = 0, replied = 0, meeting = 0, won = 0;
    const counts = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0]));
    for (const c of companies) {
      const s = statusOf(c.id);
      if (s !== "New") emailed++;
      if (["Replied", "Meeting", "Won"].includes(s)) replied++;
      if (s === "Meeting") meeting++;
      if (s === "Won") won++;
      if (counts[s] !== undefined) counts[s]++;
    }
    const sendable = companies.filter((c) => c.ownerEmail).length;
    const rate = emailed ? Math.round((replied / emailed) * 100) : 0;
    return { emailed, replied, meeting, won, sendable, rate, counts, max: Math.max(1, ...Object.values(counts)) };
  }, [companies, entries]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = companies.filter((c) => {
      const s = statusOf(c.id);
      if (fRegion && regionOf(c) !== fRegion) return false;
      if (fState && stateOf(c) !== fState) return false;
      if (fStatus && s !== fStatus) return false;
      if (fEmail === "y" && !c.ownerEmail) return false;
      if (fEmail === "n" && c.ownerEmail) return false;
      if (!needle) return true;
      return [c.name, c.owner, c.city, c.state, c.ownerEmail, c.channel, entryOf(c.id).note]
        .some((v) => v && String(v).toLowerCase().includes(needle));
    });
    const { k, dir } = sort;
    list.sort((a, b) => {
      const x = k === "status" ? statusOf(a.id) : k === "region" ? regionOf(a) : (a[k] || "");
      const y = k === "status" ? statusOf(b.id) : k === "region" ? regionOf(b) : (b[k] || "");
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
    return list;
  }, [companies, entries, q, fRegion, fState, fStatus, fEmail, sort]);

  // Any change to search/filters/sort re-anchors to page 1 (also clamps if the list shrinks).
  useEffect(() => { setPage(0); }, [q, fRegion, fState, fStatus, fEmail, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function scheduleSave(next) {
    setEntries(next); setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaveState("saving");
      const res = await saveOutreach(resolved, entriesRef.current);
      setSaveState(res.ok ? "saved" : res.status === 401 ? "denied" : "failed");
    }, 900);
  }
  const patch = (id, part) => scheduleSave({ ...entriesRef.current, [id]: { ...entriesRef.current[id], ...part, updatedAt: new Date().toISOString() } });

  // Prospect quick-look card's "Refresh" button — re-pulls the full account book from HubSpot
  // (bypassing the 5-min session cache) so a rep gets current data right before a call, without
  // reloading the whole page or losing their place in the table.
  async function refreshCrm() {
    setRefreshing(true);
    try {
      const fresh = await getCrmData(resolved, { force: true });
      if (fresh) setData(fresh);
    } finally {
      setRefreshing(false);
    }
  }

  function exportCsv() {
    const hdr = ["Company", "Channel", "Region", "City", "State", "Owner", "Email", "Phone", "Status", "LastReply", "Notes"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((c) => {
      const r = entryOf(c.id);
      return [c.name, c.channel, regionOf(c), c.city, c.state, c.owner, c.ownerEmail, c.ownerPhone || c.phone, statusOf(c.id), r.lastReply || "", r.note || ""].map(esc).join(",");
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[hdr.map(esc).join(","), ...rows].join("\n")], { type: "text/csv" }));
    a.download = `${resolved.id}-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  const th = (label, k) => (
    <th onClick={k ? () => setSort((s) => ({ k, dir: s.k === k ? -s.dir : 1 })) : undefined}>
      {label}{k && sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );

  const acct = state === "loading" ? { cls: "", text: "Loading accounts…" }
    : state === "error" ? { cls: "warn", text: "CRM unavailable" }
    : crmIsSample ? { cls: "warn", text: "Sample data — set VITE_CRM_BACKEND=hubspot" }
    : saveState === "dirty" || saveState === "saving" ? { cls: "", text: "Saving…" }
    : saveState === "denied" ? { cls: "warn", text: "Read-only — admin passcode required to save" }
    : saveState === "failed" ? { cls: "warn", text: "Save failed — retry an edit" }
    : { cls: "live", text: `HubSpot live ✓ ${companies.length.toLocaleString()} accounts` };

  const kpis = [
    ["Contacts", data?.contacts ?? "—", ""],
    ["Sendable (email)", kpi.sendable, ""],
    ["Emailed", kpi.emailed, ""],
    ["Replied", kpi.replied, "gold"],
    ["Response rate", `${kpi.rate}%`, "gold"],
    ["Meetings / Won", `${kpi.meeting} / ${kpi.won}`, ""],
  ];

  return (
    <div className="crmc">
      <style>{CSS}</style>
      <div className="hdr">
        <div>
          <h1>{resolved.brand.name} — Outreach CRM</h1>
          <div className="sub">Accounts live from HubSpot (read-only) · status &amp; notes owned by the platform</div>
        </div>
        <div className={`acct ${acct.cls}`}>{acct.text}</div>
      </div>

      <div className="kpis">
        {kpis.map(([l, n, g]) => (
          <div key={l} className={`kpi ${g}`}><div className="n">{typeof n === "number" ? n.toLocaleString() : n}</div><div className="l">{l}</div></div>
        ))}
      </div>

      <div className="bar-wrap">
        {FUNNEL_STAGES.map((s) => (
          <button key={s} className={`stage ${fStatus === s ? "on" : ""}`} onClick={() => setFStatus(fStatus === s ? "" : s)}>
            <div className="sn">{kpi.counts[s]}</div>
            <div className="sl">{s}</div>
            <div className="track"><div className="fill" style={{ width: `${(kpi.counts[s] / kpi.max) * 100}%` }} /></div>
          </button>
        ))}
      </div>

      <div className="controls">
        <input
          className="search"
          placeholder="Search shop, owner, city, email… (Enter opens the top match)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && filtered.length) setLookup(filtered[0].id); }}
        />
        <select value={fRegion} onChange={(e) => setFRegion(e.target.value)}>
          <option value="">All regions ({companies.length.toLocaleString()})</option>
          {regions.map(([r, n]) => <option key={r} value={r}>{r} ({n})</option>)}
        </select>
        <select value={fState} onChange={(e) => setFState(e.target.value)}>
          <option value="">All states ({companies.length.toLocaleString()})</option>
          {states.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All statuses</option>
          {OUTREACH_STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={fEmail} onChange={(e) => setFEmail(e.target.value)}>
          <option value="">All contacts</option>
          <option value="y">Has email</option>
          <option value="n">No email</option>
        </select>
        <button className="btn ghost" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
        {/* Doorway to the field tool. Purely a shortcut — Booth already reads this same account
            book through getCrmData(); the difference is that it snapshots it for offline use. */}
        {onNavigate && (
          <button className="btn ghost" onClick={() => onNavigate("tool:booth")}>Booth to Meeting →</button>
        )}
      </div>

      {/* Live result counter — every query (search, region, state, status, email) shows its total. */}
      {state === "ok" && (
        <div className="muted" style={{ margin: "2px 0 4px" }}>
          <strong>{filtered.length.toLocaleString()}</strong> account{filtered.length === 1 ? "" : "s"} match
          {(q || fRegion || fState || fStatus || fEmail) ? " this query" : ""} · {companies.length.toLocaleString()} total
          {fRegion && ` · region: ${fRegion}`}{fState && ` · state: ${fState}`}
        </div>
      )}

      {(data?.activity?.length || 0) > 0 && (
        <div className="resp">
          <h3>Email activity <span className="muted">({data.activity.length})</span></h3>
          {data.activity.slice(0, 8).map((a, i) => (
            <div key={i} className="ritem">
              <div className="rf">{a.who}{/Reply/.test(a.what) && <span className="tag">reply</span>}</div>
              <div className="rs">{a.what} · {a.when}</div>
            </div>
          ))}
        </div>
      )}

      <table>
        <thead>
          <tr>
            {th("Shop", "name")}
            {th("Location", "city")}
            {th("Contact")}
            {th("Region", "region")}
            {th("Status", "status")}
            {th("Last reply")}
            {th("Notes")}
            {th("")}
          </tr>
        </thead>
        <tbody>
          {state === "loading" ? (
            <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>Loading…</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>
              {companies.length === 0 ? "No accounts in the connected CRM." : "No accounts match the filters."}
            </td></tr>
          ) : pageRows.map((c) => {
            const r = entryOf(c.id);
            const s = statusOf(c.id);
            return (
              <tr key={c.id}>
                <td>
                  <span className="shop">{c.name}</span>
                  {c.channel && <><br /><span className="muted">{c.channel}</span></>}
                </td>
                <td>{[c.city, c.state].filter(Boolean).join(", ") || <span className="muted">—</span>}</td>
                <td>
                  {c.owner || <span className="muted">owner n/a</span>}<br />
                  {c.ownerEmail ? <a href={`mailto:${c.ownerEmail}`}>{c.ownerEmail}</a> : <span className="muted">no email</span>}
                  {(c.ownerPhone || c.phone) && <><br /><span className="muted">{c.ownerPhone || c.phone}</span></>}
                </td>
                <td><span className="pill">{regionOf(c)}</span></td>
                <td>
                  <select className={statusClass(s)} value={s} onChange={(e) => patch(c.id, { status: e.target.value })}>
                    {OUTREACH_STAGES.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </td>
                <td className="muted">{r.lastReply ? <>{r.lastReply}{r.lastSubj && <><br />{r.lastSubj}</>}</> : "—"}</td>
                <td><textarea className="note" placeholder="note…" defaultValue={r.note || ""} onChange={(e) => patch(c.id, { note: e.target.value })} /></td>
                <td className="cell-actions">
                  <button className="lnk" onClick={() => setLookup(c.id)}>🔎 Look up</button>{" "}
                  {c.ownerEmail && <a href={`mailto:${c.ownerEmail}`}>✉ Email</a>}
                  {c.domain && <a href={`https://${c.domain}`} target="_blank" rel="noreferrer">↗ Site</a>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length > PAGE_SIZE && (
        <div className="pager">
          <button className="btn ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>← Prev</button>
          <span className="muted">
            {(safePage * PAGE_SIZE + 1).toLocaleString()}–{Math.min(filtered.length, (safePage + 1) * PAGE_SIZE).toLocaleString()} of {filtered.length.toLocaleString()} · page {safePage + 1} / {pageCount}
          </span>
          <button className="btn ghost" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}>Next →</button>
        </div>
      )}

      <div className="foot">
        Owned by CheeseShop TECH. Accounts &amp; contacts live in HubSpot (read-only of record); status &amp; notes
        save to the platform (admin passcode). Gmail sync &amp; one-click drafts return once a server-side Gmail
        line is wired in.
      </div>

      {/* Prospect quick-look card (2026-09-09) — one focused window with the full address,
          website, and contact for a single account, meant to be opened right before a call or
          email: search → Enter (or the row's "Look up" action) → this card → Call/Email. */}
      {lookup && (
        <ProspectCard
          company={companies.find((c) => c.id === lookup)}
          entry={entryOf(lookup)}
          activity={data?.activity}
          refreshing={refreshing}
          onClose={() => setLookup(null)}
          onPatch={(part) => patch(lookup, part)}
          onRefresh={refreshCrm}
        />
      )}
    </div>
  );
}

// Prospect quick-look card — full address (with a map link), website, phone, primary contact,
// outreach status/notes, and any matching recent email activity, plus one-tap Call/Email. This
// is the "just before a call" window: everything a rep needs in one place, with a Refresh button
// that re-pulls HubSpot without losing the table's search/filter state underneath.
function ProspectCard({ company, entry, activity, refreshing, onClose, onPatch, onRefresh }) {
  if (!company) return null;
  const addr = addressOf(company);
  const mapUrl = mapUrlOf(company);
  const site = websiteUrlOf(company);
  const phone = company.ownerPhone || company.phone;
  const status = entry?.status || "New";
  // The email-activity feed has no companyId to join on — best-effort match against the shop
  // name or primary contact's name (the feed itself is capped at 20 recent items app-wide).
  const related = (activity || []).filter(
    (a) => (company.name && a.who?.includes(company.name)) || (company.owner && a.who?.includes(company.owner))
  );

  return (
    <div className="crmc-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="crmc-sheet" role="dialog" aria-modal="true" aria-label={`${company.name} — prospect lookup`}>
        <div className="pc-hdr">
          <div>
            <h2>{company.name}</h2>
            <div className="pc-sub">{company.channel || "—"}{company.businessType ? ` · ${company.businessType}` : ""}</div>
          </div>
          <button className="pc-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="pc-row">
          <div className="pc-l">Address</div>
          <div className="pc-v">
            {addr || <span className="muted">no address on file</span>}
            {mapUrl && <><br /><a href={mapUrl} target="_blank" rel="noreferrer">📍 Map</a></>}
          </div>
        </div>
        <div className="pc-row">
          <div className="pc-l">Website</div>
          <div className="pc-v">
            {site ? <a href={site} target="_blank" rel="noreferrer">{company.domain} ↗</a> : <span className="muted">no website on file</span>}
          </div>
        </div>
        <div className="pc-row">
          <div className="pc-l">Phone</div>
          <div className="pc-v">{phone ? <a href={`tel:${phone}`}>{phone}</a> : <span className="muted">no phone on file</span>}</div>
        </div>
        <div className="pc-row">
          <div className="pc-l">Contact</div>
          <div className="pc-v">
            {company.owner || <span className="muted">owner n/a</span>}
            {company.ownerEmail && <><br /><a href={`mailto:${company.ownerEmail}`}>{company.ownerEmail}</a></>}
          </div>
        </div>
        <div className="pc-row">
          <div className="pc-l">Status</div>
          <div className="pc-v">
            <select className={statusClass(status)} value={status} onChange={(e) => onPatch({ status: e.target.value })}>
              {OUTREACH_STAGES.map((o) => <option key={o}>{o}</option>)}
            </select>
            {entry?.lastReply && <span className="muted"> · last reply {entry.lastReply}</span>}
          </div>
        </div>
        <div className="pc-row">
          <div className="pc-l">Notes</div>
          <div className="pc-v">
            <textarea
              className="note"
              placeholder="note before the call…"
              defaultValue={entry?.note || ""}
              onChange={(e) => onPatch({ note: e.target.value })}
            />
          </div>
        </div>

        {related.length > 0 && (
          <div className="pc-activity">
            <div className="pc-l" style={{ marginBottom: 4 }}>Recent activity</div>
            {related.slice(0, 4).map((a, i) => (
              <div key={i} className="pc-act-item">{a.what} · <span className="muted">{a.when}</span></div>
            ))}
          </div>
        )}

        <div className="pc-acts">
          {phone && <a className="btn" href={`tel:${phone}`}>📞 Call</a>}
          {company.ownerEmail && <a className="btn" href={`mailto:${company.ownerEmail}`}>✉ Email</a>}
          <button className="btn ghost" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "⟳ Refresh"}</button>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
