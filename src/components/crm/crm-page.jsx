import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { writeAuthHeader } from "@/lib/auth-context.jsx";
import { RELOGIN_MSG } from "@/lib/media.js";

// CRM page (tenant Operations portal). Read-only view of the connected HubSpot CRM via the
// crm-summary function (server-side service key). Shows pipeline totals + the newest contacts.
// Distinct from the Campaigns page (social/email marketing). Records are managed in HubSpot.
export function CrmPage({ resolved }) {
  const [state, setState] = useState("loading"); // "loading" | "error" | "relogin" | { counts, recentContacts }
  useEffect(() => {
    let alive = true;
    // Passcode header required server-side since 2026-07-16. A 401 = this browser unlocked
    // before that deploy (no stashed passcode) → tell the user the fix, not a bare "unavailable".
    fetch(`/.netlify/functions/crm-summary?tenant=${encodeURIComponent(resolved.id || "")}`, { headers: { ...writeAuthHeader() } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (alive) setState(d?.counts ? d : "error"); })
      .catch((status) => { if (alive) setState(status === 401 ? "relogin" : "error"); });
    return () => { alive = false; };
  }, [resolved.id]);

  const ok = state && typeof state === "object";
  const counts = ok ? state.counts : {};
  const recent = ok ? (state.recentContacts || []) : [];
  const tiles = [
    { label: "Contacts", key: "contacts" },
    { label: "Companies", key: "companies" },
    { label: "Deals", key: "deals" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-heading text-3xl text-fg">CRM</h1>
          <p className="text-fg-muted">{resolved.brand.name}'s pipeline — live from HubSpot, read-only.</p>
        </div>
        {ok && <Badge variant="success">Live</Badge>}
        {state === "error" && <Badge variant="muted">Unavailable</Badge>}
        {state === "relogin" && <Badge variant="warning">Sign in again</Badge>}
      </div>
      {state === "relogin" && (
        <p className="mb-6 rounded-base border border-border bg-surface p-3 text-sm text-fg-muted">{RELOGIN_MSG}</p>
      )}

      <div className="mb-6 grid grid-cols-3 gap-4">
        {tiles.map((t) => {
          const v = ok ? counts[t.key] : null;
          return (
            <div key={t.key} className="rounded-xl border border-border bg-surface p-5 text-center">
              <div className="font-heading text-3xl text-brand-primary">
                {state === "loading" ? "…" : (typeof v === "number" ? v.toLocaleString() : "—")}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-fg-muted">{t.label}</div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent contacts</CardTitle>
          <CardDescription>Newest contacts in the connected CRM. Add or edit records in HubSpot.</CardDescription>
        </CardHeader>
        <CardContent>
          {state === "loading" ? (
            <p className="py-8 text-center text-sm text-fg-muted">Loading…</p>
          ) : state === "error" ? (
            <p className="py-8 text-center text-sm text-fg-muted">CRM unavailable — check the connection in the house dashboard's Integration health.</p>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-muted">No recent contacts.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-fg">{c.name}</TableCell>
                    <TableCell className="text-fg-muted">{c.email || "—"}</TableCell>
                    <TableCell className="text-fg-muted">{c.company || "—"}</TableCell>
                    <TableCell className="text-fg-muted">{c.created ? new Date(c.created).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
