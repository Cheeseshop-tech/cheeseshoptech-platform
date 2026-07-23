import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select.jsx";
import { getCrmData, getOutreach, saveOutreach, OUTREACH_STAGES, crmIsSample } from "@/lib/crm.js";
import { RELOGIN_MSG } from "@/lib/media.js";

// CRM page (tenant Operations portal) — the OUTREACH CONSOLE. Ports the campaign-CRM artifact's
// information design (Prospecting Phase 10: KPI tiles → stage funnel → filters → account table
// with editable status/notes → CSV export) onto the platform:
//   · Accounts/contacts = live HubSpot, read-only (crm-hubspot.js — the CRM of record).
//   · Outreach status + notes = platform-owned overlay in Netlify Blobs (crm-outreach.js),
//     because the HubSpot private app is deliberately read-only.
//   · Gmail sync / draft creation (artifact-runtime features) are NOT ported — they need a
//     server-side Gmail integration; deferred (see BUILD_LOG 2026-07-22).
// No per-client code: everything is driven by the tenant's resolved config.
const ROW_CAP = 250; // render cap — filters/search narrow within the full set

export function CrmPage({ resolved }) {
  const [state, setState] = useState("loading"); // "loading" | "error" | "relogin" | "ok"
  const [data, setData] = useState(null);        // { contacts, companies[], activity[] }
  const [entries, setEntries] = useState({});    // companyId -> { status, note, updatedAt }
  const [saveState, setSaveState] = useState("idle"); // "idle" | "dirty" | "saving" | "saved" | "denied" | "failed"
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("all");
  const [stage, setStage] = useState("all");
  const timer = useRef(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    let alive = true;
    Promise.all([getCrmData(resolved), getOutreach(resolved)])
      .then(([crm, outreach]) => {
        if (!alive) return;
        if (!crm) { setState("error"); return; }
        setData(crm);
        setEntries(outreach.entries || {});
        setState("ok");
      })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [resolved.id]);

  const companies = useMemo(
    () => [...(data?.companies || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );
  const channels = useMemo(
    () => [...new Set(companies.map((c) => c.channel).filter(Boolean))].sort(),
    [companies]
  );
  const statusOf = (c) => entries[c.id]?.status || "New";

  // Stage funnel + KPI aggregates (companies with no saved entry count as "New").
  const funnel = useMemo(() => {
    const counts = Object.fromEntries(OUTREACH_STAGES.map((s) => [s, 0]));
    for (const c of companies) counts[statusOf(c)] += 1;
    return counts;
  }, [companies, entries]);
  const emailed = funnel.Emailed + funnel.Replied + funnel.Meeting + funnel.Won; // progressed past send
  const replied = funnel.Replied + funnel.Meeting + funnel.Won;
  const rate = emailed ? Math.round((replied / emailed) * 100) : 0;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return companies.filter((c) => {
      if (channel !== "all" && c.channel !== channel) return false;
      if (stage !== "all" && statusOf(c) !== stage) return false;
      if (!needle) return true;
      return [c.name, c.city, c.state, c.domain, entries[c.id]?.note]
        .some((v) => v && String(v).toLowerCase().includes(needle));
    });
  }, [companies, entries, q, channel, stage]);

  // Debounced full-document save (last-writer-wins, mirrors items-save's trade-off).
  function scheduleSave(next) {
    setEntries(next);
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaveState("saving");
      const res = await saveOutreach(resolved, entriesRef.current);
      setSaveState(res.ok ? "saved" : res.status === 401 ? "denied" : "failed");
    }, 900);
  }
  const setStatus = (id, status) => scheduleSave({ ...entriesRef.current, [id]: { ...entriesRef.current[id], status, updatedAt: new Date().toISOString() } });
  const setNote = (id, note) => scheduleSave({ ...entriesRef.current, [id]: { ...entriesRef.current[id], note, updatedAt: new Date().toISOString() } });

  function exportCsv() {
    const cols = ["Company", "Domain", "City", "State", "Channel", "Phone", "Status", "Notes"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((c) => [c.name, c.domain, c.city, c.state, c.channel, c.phone, statusOf(c), entries[c.id]?.note || ""]);
    const csv = [cols, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${resolved.id}-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const tiles = [
    { label: "Contacts", value: data?.contacts },
    { label: "Companies", value: companies.length },
    { label: "Emailed", value: emailed },
    { label: "Replied", value: replied },
    { label: "Response rate", value: emailed ? `${rate}%` : "—" },
  ];
  const saveLabel = {
    dirty: "Unsaved changes…", saving: "Saving…", saved: "Saved ✓",
    denied: "Read-only — admin passcode required to save", failed: "Save failed — retry an edit",
  }[saveState];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-heading text-3xl text-fg">CRM</h1>
          <p className="text-fg-muted">
            {resolved.brand.name}'s outreach console — accounts live from HubSpot (read-only), status owned here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveLabel && <span className={`text-xs ${saveState === "denied" || saveState === "failed" ? "text-warning" : "text-fg-muted"}`}>{saveLabel}</span>}
          {crmIsSample ? <Badge variant="muted">Sample</Badge> : state === "ok" ? <Badge variant="success">Live</Badge> : null}
          {state === "error" && <Badge variant="muted">Unavailable</Badge>}
          {state === "relogin" && <Badge variant="warning">Sign in again</Badge>}
        </div>
      </div>
      {state === "relogin" && (
        <p className="mb-6 rounded-base border border-border bg-surface p-3 text-sm text-fg-muted">{RELOGIN_MSG}</p>
      )}

      {/* KPI tiles */}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-border bg-surface p-4 text-center">
            <div className="font-heading text-2xl text-brand-primary">
              {state === "loading" ? "…" : (t.value ?? "—").toLocaleString?.() ?? t.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-fg-muted">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Stage funnel */}
      <div className="mb-6 grid grid-cols-3 gap-3 md:grid-cols-6">
        {OUTREACH_STAGES.map((s) => {
          const n = funnel[s] || 0;
          const pct = companies.length ? Math.max(2, Math.round((n / companies.length) * 100)) : 0;
          return (
            <button
              key={s}
              onClick={() => setStage(stage === s ? "all" : s)}
              className={`rounded-base border p-3 text-left transition-colors ${stage === s ? "border-brand-primary bg-brand-primary/5" : "border-border bg-surface hover:border-brand-primary/40"}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-fg">{s}</span>
                <span className="font-heading text-lg text-brand-primary">{n}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Email activity (needs sales-email-read scope; hides when empty) */}
      {(data?.activity?.length || 0) > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Email activity</CardTitle>
            <CardDescription>Recent sends and replies on the connected inbox.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.activity.slice(0, 6).map((a, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                  <span><span className="font-medium text-fg">{a.who}</span>{" "}<span className="text-fg-muted">{a.what}</span></span>
                  <span className="shrink-0 text-xs text-fg-muted">{a.when}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Accounts console */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            Every company in the connected CRM, with its channel. Status and notes save to the platform — records themselves are managed in HubSpot.
          </CardDescription>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, city, note…" className="h-9 w-56" />
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All channels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {channels.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {OUTREACH_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-fg-muted">{filtered.length.toLocaleString()} of {companies.length.toLocaleString()}</span>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          {state === "loading" ? (
            <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>
          ) : state === "error" ? (
            <p className="py-8 text-center text-sm text-fg-muted">CRM unavailable — check the connection in the house dashboard's Integration health.</p>
          ) : companies.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-muted">
              {crmIsSample ? "Sample backend has no account list — set VITE_CRM_BACKEND=hubspot for live accounts." : "No companies in the connected CRM."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead className="w-64">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, ROW_CAP).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium text-fg">{c.name}</div>
                        {c.domain && (
                          <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" className="text-xs text-brand-primary hover:underline">
                            {c.domain}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-fg-muted">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell>{c.channel ? <Badge variant="muted">{c.channel}</Badge> : <span className="text-fg-muted">—</span>}</TableCell>
                      <TableCell>
                        <Select value={statusOf(c)} onValueChange={(v) => setStatus(c.id, v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {OUTREACH_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          defaultValue={entries[c.id]?.note || ""}
                          onChange={(e) => setNote(c.id, e.target.value)}
                          placeholder="Add a note…"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > ROW_CAP && (
                <p className="mt-3 text-center text-xs text-fg-muted">
                  Showing the first {ROW_CAP} of {filtered.length.toLocaleString()} — narrow with search or filters.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
