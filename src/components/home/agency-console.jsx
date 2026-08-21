import { useEffect, useMemo, useRef, useState } from "react";
import { Users, PlugZap, Database, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, CircleDashed, ShieldCheck, Maximize2, ListChecks } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.jsx";
import { listClients } from "@/lib/clientConfig.js";
import { getPricingData, fetchInventory } from "@/lib/pricing.js";
import { getBuyerCatalog } from "@/lib/catalog.js";
import { authHeaders } from "@/lib/auth-context.jsx";
import { cn } from "@/lib/utils.js";
import { PROJECT_THREADS, PROJECT_RADAR, PROJECT_STATUS_UPDATED, STATUS_BADGE_VARIANT } from "@/lib/project-status.js";

// Agency Console — the house dashboard's P0 panels (ADMIN_DASHBOARDS_SPEC §3, built per
// Rick's v1 priorities): tenant management · integration health · data pipelines.
// Everything here is computed from config + bundled canonical data + build-time env flags;
// server-side secret PRESENCE is probed via function pings (values never reach the browser).
export function AgencyConsole({ onNavigate }) {
  const clients = listClients();

  return (
    <div className="mt-10">
      <h2 className="cs-display mb-1 text-2xl text-brand-primary">Agency console</h2>
      <p className="mb-5 text-sm text-fg-muted">
        Tenants, integration wiring, and data freshness — the answers that used to live only in HANDOFF.md.
      </p>
      <div className="space-y-5">
        <ProjectStatusPanel />
        <CrmSnapshotPanel />
        <TenantPanel clients={clients} onNavigate={onNavigate} />
        <IntegrationPanel clients={clients} />
        <PipelinePanel clients={clients} />
        <LoginLogPanel />
      </div>
    </div>
  );
}

/* ---------------- Project status (CheeseShop TECH itself — Agency Console view of the
   in-app Progress/Onboarding tab, docs/PROGRESS_TAB_SPEC_2026-08-17.md) ---------------- */

function ProjectStatusPanel() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <PanelIcon icon={ListChecks} />
        <div>
          <CardTitle>CheeseShop TECH — project status</CardTitle>
          <CardDescription>
            Every active thread, synced from docs/PROJECT_ROADMAP.md · last updated {PROJECT_STATUS_UPDATED}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {PROJECT_THREADS.map((t) => (
            <div key={t.id} className="rounded-base border border-border bg-bg p-4">
              <div className="flex items-center gap-3">
                <h3 className="font-heading text-base text-fg">{t.label}</h3>
                <Badge variant={STATUS_BADGE_VARIANT[t.status] || "muted"} className="ml-auto">
                  {t.statusLabel}
                </Badge>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full bg-brand-primary" style={{ width: `${t.progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-fg-muted">
                <span className="font-medium text-fg">Next:</span> {t.nextAction}
              </p>
            </div>
          ))}
        </div>
        {PROJECT_RADAR.length > 0 && (
          <div className="mt-4 rounded-base border border-dashed border-border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">On the radar</p>
            <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
              {PROJECT_RADAR.map((item, i) => (
                <li key={i}>· {item}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-xs text-fg-muted">
          This is a hand-maintained mirror of docs/PROJECT_ROADMAP.md, not a live parse — update
          src/lib/project-status.js whenever a thread's status changes there.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Login log (who unlocked the portal, from where) ---------------- */

// Reads netlify/functions/login-log.js — house-admin only, same tier as this whole console
// (RoleGate roles={["admin"]} in home-hub.jsx), so no extra gate needed here. Every real gate.js
// attempt is recorded (2026-07-18); health-check pings with an empty passcode are not. The
// server already returns newest-first (login-log.js reverses its append-only log before sending).
const VISIBLE_ROWS = 10; // rows visible before the panel scrolls (2026-07-18, Rick asked for this)

function LoginLogPanel() {
  const [state, setState] = useState("loading"); // "loading" | "error" | { entries, count }
  const [refreshKey, setRefreshKey] = useState(0);
  const [expanded, setExpanded] = useState(false); // full-screen dialog toggle
  // Refresh button feedback (2026-07-18, Rick asked for it): spin the icon while the request is
  // in flight, then flash the button green for a beat once fresh data lands — so a click reads
  // as "working, then done" instead of silently swapping the table underneath you.
  const [refreshing, setRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const isFirstLoad = useRef(true); // don't flash green on the initial page load, only on clicks

  useEffect(() => {
    let alive = true;
    authHeaders()
      .then((headers) => fetch("/.netlify/functions/login-log", { headers }))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (!alive) return;
        setState(d?.entries ? d : "error");
        setRefreshing(false);
        if (!isFirstLoad.current) setJustRefreshed(true);
        isFirstLoad.current = false;
      })
      .catch(() => {
        if (!alive) return;
        setState("error");
        setRefreshing(false);
        isFirstLoad.current = false;
      });
    return () => { alive = false; };
  }, [refreshKey]);

  // Auto-revert the green "Updated" flash after a beat.
  useEffect(() => {
    if (!justRefreshed) return undefined;
    const t = setTimeout(() => setJustRefreshed(false), 1400);
    return () => clearTimeout(t);
  }, [justRefreshed]);

  function handleRefresh() {
    setRefreshing(true);
    setJustRefreshed(false);
    setRefreshKey((k) => k + 1);
  }

  const ok = state && typeof state === "object";
  // Whole recorded window (server already caps at 500, its own rolling window) — the panel
  // itself decides how much of that to SHOW via scrolling/expanding, not by truncating the data.
  const rows = ok ? state.entries : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <PanelIcon icon={ShieldCheck} />
        <div>
          <CardTitle>Access log <span className="text-xs font-normal text-fg-muted">· portal logins</span></CardTitle>
          <CardDescription>Every sign-in — name, when, which tier, success or failure. Newest first.</CardDescription>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded(true)} disabled={!ok || rows.length === 0}>
            <Maximize2 className="h-3.5 w-3.5" /> Expand
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              "transition-colors duration-300",
              justRefreshed && "border-success bg-success text-white hover:bg-success"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            {justRefreshed ? "Updated" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {state === "loading" && <p className="text-sm text-fg-muted">Loading…</p>}
        {state === "error" && <p className="text-sm text-fg-muted">Unavailable — check you're signed in as house admin.</p>}
        {ok && rows.length === 0 && <p className="text-sm text-fg-muted">No login attempts recorded yet.</p>}
        {ok && rows.length > 0 && (
          <>
            {/* Scroll window sized to ~10 rows (VISIBLE_ROWS) — "Expand" above opens the same
                table full-screen for scanning the whole recorded window at once. */}
            <div className="max-h-[27rem] overflow-y-auto">
              <LoginLogTable rows={rows} />
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              {rows.length} of {state.count} recorded attempt{state.count === 1 ? "" : "s"} (rolling window, last 500 kept)
              {rows.length > VISIBLE_ROWS ? " — scroll for more, or Expand for full screen." : "."}
            </p>
          </>
        )}
      </CardContent>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col">
          <DialogHeader>
            <DialogTitle>Access log — full history</DialogTitle>
            <DialogDescription>
              Every sign-in recorded — name, when, which tier, success or failure. Newest first.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {ok && rows.length > 0 && <LoginLogTable rows={rows} />}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Shared table body for both the compact (10-row scroll window) and expanded (full-screen)
// views — one render path so the two can never visually drift apart. Header is sticky within
// whichever scrolling ancestor wraps it (the compact scroll div, or the dialog's scroll div).
function LoginLogTable({ rows }) {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-bg">
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Who</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Tenant</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell className="whitespace-nowrap text-xs">{r.ts}</TableCell>
            {/* Name/email only exist on real Identity rows (record-login.js) — every row from
                the legacy passcode gate (gate.js) is a shared secret with no individual behind
                it, so this falls back to the tier label rather than showing a blank cell. */}
            <TableCell className="text-xs">
              {r.name || r.email ? (
                <div className="leading-tight">
                  {r.name && <div className="font-medium text-fg">{r.name}</div>}
                  {r.email && <div className="text-fg-muted">{r.email}</div>}
                </div>
              ) : (
                <span className="text-fg-muted">{r.source === "identity" ? "—" : "shared passcode"}</span>
              )}
            </TableCell>
            <TableCell className="font-mono text-xs">{r.ip || "—"}</TableCell>
            <TableCell className="text-xs">{[r.city, r.region].filter(Boolean).join(", ") || "—"}</TableCell>
            <TableCell className="text-xs">{r.tenant || "—"}</TableCell>
            <TableCell className="text-xs">{r.role || "—"}</TableCell>
            <TableCell>
              {r.ok
                ? <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />ok</Badge>
                : <Badge variant="error"><AlertTriangle className="mr-1 h-3 w-3" />failed</Badge>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ---------------- CRM snapshot (live, read-only HubSpot) ---------------- */

// Auto-loads on mount from the read-only crm-summary function (HubSpot via the service key, server-side).
// Falls back gracefully to "—"/unavailable in dev (no functions) or if the token/scopes aren't set.
function CrmSnapshotPanel() {
  const [state, setState] = useState("loading"); // "loading" | "error" | "relogin" | { counts }
  useEffect(() => {
    let alive = true;
    // Passcode header required server-side since 2026-07-16 (read guard). 401 = browser
    // unlocked before that deploy → no stashed passcode → sign out/in fixes it.
    authHeaders()
      .then((headers) => fetch("/.netlify/functions/crm-summary", { headers }))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (alive) setState(d?.counts ? d : "error"); })
      .catch((status) => { if (alive) setState(status === 401 ? "relogin" : "error"); });
    return () => { alive = false; };
  }, []);

  const ok = state && typeof state === "object";
  const tiles = [
    { label: "Contacts", key: "contacts" },
    { label: "Companies", key: "companies" },
    { label: "Deals", key: "deals" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <PanelIcon icon={Users} />
        <div>
          <CardTitle>CRM snapshot <span className="text-xs font-normal text-fg-muted">· HubSpot, read-only</span></CardTitle>
          <CardDescription>Live totals from the connected CRM.</CardDescription>
        </div>
        {ok && <Badge variant="success" className="ml-auto"><CheckCircle2 className="mr-1 h-3 w-3" />live</Badge>}
        {state === "error" && <Badge variant="muted" className="ml-auto">unavailable</Badge>}
        {state === "relogin" && <Badge variant="warning" className="ml-auto">sign out &amp; re-enter passcode</Badge>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {tiles.map((t) => {
            const v = ok ? state.counts[t.key] : null;
            return (
              <div key={t.key} className="rounded-base border border-border bg-bg p-4 text-center">
                <div className="font-heading text-3xl text-brand-primary">
                  {state === "loading" ? "…" : (typeof v === "number" ? v.toLocaleString() : "—")}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-fg-muted">{t.label}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Tenant management ---------------- */

function TenantPanel({ clients }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <PanelIcon icon={Users} />
        <div>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Every client portal on the platform. Onboarding = config only, no code.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((c) => {
            const live = (c.tools || []).filter((t) => t.status === "live").length;
            const soon = (c.tools || []).length - live;
            const storefront = (c.tools || []).find((t) => t.key === "shopify" && t.url);
            return (
              <div key={c.id} className="rounded-base border border-border bg-bg p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-4 w-4 flex-none rounded-full border border-border"
                    style={{ background: c.brand?.colors?.primary }}
                    aria-hidden
                  />
                  <h3 className="font-heading text-lg text-fg">{c.brand?.name || c.id}</h3>
                  <Badge variant="success" className="ml-auto">live</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs uppercase text-fg-muted">Modules</dt><dd className="text-fg">{(c.modules || []).length}</dd></div>
                  <div><dt className="text-xs uppercase text-fg-muted">Tools</dt><dd className="text-fg">{live} live{soon ? ` · ${soon} soon` : ""}</dd></div>
                  <div><dt className="text-xs uppercase text-fg-muted">Decks</dt><dd className="text-fg">{(c.presentations || []).length}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline"
                    href={`?client=${c.subdomain}`}
                  >
                    Portal <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {storefront && (
                    <a
                      className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline"
                      href={storefront.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Storefront <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <span className="ml-auto font-mono text-xs text-fg-muted">{c.subdomain}.cheeseshoptech.com</span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-center rounded-base border border-dashed border-border p-4 text-center">
            <div>
              <p className="font-heading text-fg">Onboard a tenant</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-fg-muted">
                Copy <code className="font-mono">config/clients/_template.json</code>, fill brand tokens + modules,
                run <code className="font-mono">npm run validate:clients</code>, deploy. Schema-validated; zero code.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Integration health ---------------- */

const ENV = import.meta.env;
// Build-time backend switches: what each seam is wired to in THIS build. No "crm" row here —
// the "HubSpot CRM (read-only)" row further down already live-tests CRM for real; a second,
// build-flag-only CRM badge next to it could disagree with the real one and nobody should trust
// a status panel that can contradict itself.
const SEAMS = [
  { key: "store", label: "Storefront", flag: ENV.VITE_STORE_BACKEND || "mock", liveWhen: "shopify" },
  { key: "media", label: "Media", flag: ENV.VITE_MEDIA_BACKEND || "mock", liveWhen: "cloudinary" },
  { key: "campaigns", label: "Campaigns", flag: ENV.VITE_CAMPAIGNS_BACKEND || "mock", liveWhen: "make" },
  { key: "signals", label: "Market signals", flag: ENV.VITE_SIGNALS_BACKEND || "mock", liveWhen: "function" },
  { key: "market-news", label: "Market news", flag: ENV.VITE_MARKETNEWS_BACKEND || "mock", liveWhen: "function" },
  { key: "pricing", label: "Pricing data", flag: ENV.VITE_PRICING_BACKEND || "mock", liveWhen: "function" },
];

// Real connectivity probes (2026-08-21, Rick: "wire live integration health status"). Before
// this, a seam's badge came ONLY from whether its build flag literally equaled "mock" — so a
// seam pointed at a dead token or a missing secret still showed a green "live" badge, the exact
// false-positive class guardrails #7/#8 already exist for elsewhere in this app (the passcode
// gate's permanent false alarm was the same failure mode in reverse: false RED instead of false
// GREEN). Only seams with an actual backend function get a real probe here — Market
// signals/Market news have no backend built yet at all, so there is nothing to call; their badge
// stays the static build-flag one, which is already accurate (there's genuinely no live path).
// Every probe returns a normalized { ok, reason?, detail? } shape so one badge renderer
// (SeamStatusBadge) can handle all of them instead of copy-pasting per-seam JSX four more times.
const SEAM_PINGS = {
  media: async (tenant, folder) => {
    if (!tenant || !folder) return { ok: false, reason: "no-tenant" };
    const res = await fetch(
      `/.netlify/functions/media-list?tenant=${encodeURIComponent(tenant)}&folder=${encodeURIComponent(folder)}&paged=1&max_results=1`,
      { headers: await authHeaders() }
    );
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, reason: /not configured/i.test(data?.error || "") ? "not-configured" : "error", detail: data?.error };
    return { ok: true, detail: `reachable (${tenant})` };
  },
  pricing: async (tenant) => {
    if (!tenant) return { ok: false, reason: "no-tenant" };
    const res = await fetch(`/.netlify/functions/inventory?tenant=${encodeURIComponent(tenant)}`, { headers: await authHeaders() });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return { ok: false, reason: "error" };
    if (data.source === "error") return { ok: false, reason: "error", detail: data.error };
    if (data.source === "none" || !data.inventory) return { ok: false, reason: "empty", detail: `reachable, no data yet (${tenant})` };
    return { ok: true, detail: `updated ${data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : "—"} (${tenant})` };
  },
  // Store (Shopify) is one storefront, not per-tenant today — see netlify/functions/store.js.
  store: async () => {
    const res = await fetch(`/.netlify/functions/store`, { headers: await authHeaders() });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, reason: /not configured/i.test(data?.error || "") ? "not-configured" : "error", detail: data?.error };
    return { ok: true, detail: `${data?.products?.length ?? "—"} products` };
  },
  campaigns: async (tenant) => {
    if (!tenant) return { ok: false, reason: "no-tenant" };
    const res = await fetch(`/.netlify/functions/campaigns?tenant=${encodeURIComponent(tenant)}`, { headers: await authHeaders() });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, reason: /not configured/i.test(data?.error || "") ? "not-configured" : "error", detail: data?.error };
    return { ok: true, detail: Array.isArray(data) ? `${data.length} campaigns (${tenant})` : `reachable (${tenant})` };
  },
};

// Shared renderer for every SEAM_PINGS result — one place that decides what "live" vs
// "not configured" vs "error" looks like, so all four probed seams read consistently.
function SeamStatusBadge({ state }) {
  if (state === "checking") return <Badge variant="muted">checking…</Badge>;
  if (!state) return <Badge variant="muted">untested</Badge>;
  if (state.ok) return <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />live</Badge>;
  if (state.reason === "not-configured") return <Badge variant="warning"><AlertTriangle className="mr-1 h-3 w-3" />not configured</Badge>;
  if (state.reason === "empty") return <Badge variant="warning">reachable, empty</Badge>;
  if (state.reason === "unauthorized") return <Badge variant="warning"><AlertTriangle className="mr-1 h-3 w-3" />not signed in</Badge>;
  if (state.reason === "no-tenant") return <Badge variant="muted">no client to test against</Badge>;
  return <Badge variant="error"><AlertTriangle className="mr-1 h-3 w-3" />error</Badge>;
}

function IntegrationPanel({ clients }) {
  const [gate, setGate] = useState(null); // null | "checking" | "ok" | "missing" | "unreachable"
  const [crm, setCrm] = useState(null); // null | "checking" | "error" | { counts }
  // One real client stands in for "does this seam actually work" — there's only one live tenant
  // (montitrentini) as of 2026-08-21, and per-tenant breakdown isn't the point here (that's
  // PipelinePanel's job below); this panel just needs ONE real tenant to prove connectivity.
  const testTenant = clients[0]?.id || null;
  const testTenantFolder = clients[0]?.cloudinaryFolder || null;
  const [seamStatus, setSeamStatus] = useState({}); // { [seamKey]: null | "checking" | {ok, reason?, detail?} }

  async function pingSeam(key) {
    const pinger = SEAM_PINGS[key];
    if (!pinger) return;
    setSeamStatus((prev) => ({ ...prev, [key]: "checking" }));
    try {
      const result = await pinger(testTenant, testTenantFolder);
      setSeamStatus((prev) => ({ ...prev, [key]: result }));
    } catch (err) {
      setSeamStatus((prev) => ({ ...prev, [key]: { ok: false, reason: "error", detail: String(err?.message || err) } }));
    }
  }

  // Read-only direct-HubSpot check (separate from the Make seam). Returns live contact/company/deal totals.
  async function pingCrm() {
    setCrm("checking");
    try {
      // Read guard (2026-07-16): the passcode header must replay, same as every other read.
      const res = await fetch("/.netlify/functions/crm-summary", { headers: { ...(await authHeaders()) } });
      const data = await res.json().catch(() => null);
      setCrm(res.status === 401 ? "relogin" : res.ok && data?.counts ? data : "error");
    } catch {
      setCrm("error");
    }
  }

  async function pingGate() {
    setGate("checking");
    try {
      // 2026-08-17: this used to POST an empty passcode to the now-retired gate.js and read its
      // status code. That function will 500 forever now that the passcode env vars are
      // deliberately deleted (see docs/HANDOFF_2026-08-17_identity-write-guard-fix.md) -- a
      // permanent false "env missing" alarm for a subsystem that's supposed to be off. Real
      // Identity is the live gate now, so this checks THAT instead: Netlify's public Identity
      // settings endpoint (no auth needed, no secret exposed -- same "presence only" posture as
      // every other probe on this panel).
      const res = await fetch("/.netlify/identity/settings");
      if (!res.ok) { setGate("misconfigured"); return; }
      const data = await res.json().catch(() => null);
      setGate(data ? "ok" : "misconfigured");
    } catch {
      setGate("unreachable"); // no Identity endpoint reachable at all -- expected in local dev
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <PanelIcon icon={PlugZap} />
        <div>
          <CardTitle>Integration health</CardTitle>
          <CardDescription>
            What's wired vs mocked in this build. Secrets live server-side — presence is probed, values never shown.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seam</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SEAMS.map((s) => {
              const live = s.flag !== "mock";
              const pinger = SEAM_PINGS[s.key];
              const state = seamStatus[s.key];
              return (
                <TableRow key={s.key}>
                  <TableCell className="font-medium">{s.label}</TableCell>
                  <TableCell><code className="font-mono text-xs">{s.flag}</code></TableCell>
                  <TableCell>
                    {pinger ? (
                      <SeamStatusBadge state={state} />
                    ) : live ? (
                      <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />live</Badge>
                    ) : (
                      <Badge variant="muted"><CircleDashed className="mr-1 h-3 w-3" />mock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-fg-muted">
                    <span className="flex flex-wrap items-center gap-2">
                      {pinger && (
                        <Button size="sm" variant="outline" onClick={() => pingSeam(s.key)} disabled={state === "checking"}>
                          <RefreshCw className={cn("h-3.5 w-3.5", state === "checking" && "animate-spin")} /> Test
                        </Button>
                      )}
                      {s.key === "store" && !live && !(state && typeof state === "object") ? "Needs real Shopify store + tokens (Phase D / STOREFRONT_STRATEGY.md)" : ""}
                      {s.key === "media" && !(state && typeof state === "object") && "Cloudinary delivery; archive layer = spec §6"}
                      {state && typeof state === "object" && state.detail && (
                        <span className={state.ok ? "text-fg" : "text-error"}>{state.detail}</span>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell className="font-medium">Auth <span className="text-xs font-normal text-fg-muted">(Identity)</span></TableCell>
              <TableCell><code className="font-mono text-xs">{ENV.VITE_AUTH_MODE || "identity"}</code></TableCell>
              <TableCell>
                {gate === "ok" && <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />configured</Badge>}
                {gate === "misconfigured" && <Badge variant="error"><AlertTriangle className="mr-1 h-3 w-3" />misconfigured</Badge>}
                {gate === "unreachable" && <Badge variant="warning">no endpoint (dev?)</Badge>}
                {gate === "checking" && <Badge variant="muted">checking…</Badge>}
                {gate === null && <Badge variant="muted">untested</Badge>}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={pingGate}>
                  <RefreshCw className="h-3.5 w-3.5" /> Test
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">HubSpot CRM <span className="text-xs font-normal text-fg-muted">(read-only)</span></TableCell>
              <TableCell><code className="font-mono text-xs">service key</code></TableCell>
              <TableCell>
                {crm && typeof crm === "object" && <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />live</Badge>}
                {crm === "error" && <Badge variant="error"><AlertTriangle className="mr-1 h-3 w-3" />error</Badge>}
                {crm === "relogin" && <Badge variant="warning"><AlertTriangle className="mr-1 h-3 w-3" />not signed in</Badge>}
                {crm === "checking" && <Badge variant="muted">checking…</Badge>}
                {crm === null && <Badge variant="muted">untested</Badge>}
              </TableCell>
              <TableCell className="text-xs text-fg-muted">
                <span className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={pingCrm}><RefreshCw className="h-3.5 w-3.5" /> Test</Button>
                  {crm && typeof crm === "object" && <span className="text-fg">{crm.counts?.contacts ?? "—"} contacts · {crm.counts?.companies ?? "—"} cos · {crm.counts?.deals ?? "—"} deals</span>}
                  {crm === "error" && <span className="text-error">check token / scopes</span>}
                  {crm === "relogin" && <span className="text-fg-muted">sign in with your real Identity account, then retest</span>}
                  {crm === null && clients.some((c) => c.crm === "hubspot") && (
                    <span className="text-fg-muted">Monti = HubSpot; wire Make once deals exist (CRM_CONNECTOR.md)</span>
                  )}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------- Data pipelines ---------------- */

const STALE_DAYS = 14;

function PipelinePanel({ clients }) {
  // Live freshness: pull each tenant's inventory from the live store (one mind / one body).
  // fetchInventory returns null for tenants without a live feed → we keep the bundled snapshot.
  const [liveInv, setLiveInv] = useState({});
  useEffect(() => {
    let alive = true;
    Promise.all(clients.map((c) => fetchInventory(c.id).then((inv) => [c.id, inv]).catch(() => [c.id, null])))
      .then((pairs) => { if (!alive) return; const m = {}; for (const [id, inv] of pairs) if (inv) m[id] = inv; setLiveInv(m); });
    return () => { alive = false; };
  }, [clients]);

  const rows = useMemo(() => clients.map((c) => {
    const pricing = getPricingData({ id: c.id });
    const buyerCatalog = getBuyerCatalog({ id: c.id });
    const inv = liveInv[c.id] || pricing?.inventory;
    const lastUpdated = inv?.lastUpdated || null;
    const ageDays = lastUpdated ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 86400000) : null;
    const skus = inv?.skus;
    return {
      id: c.id,
      name: c.brand?.name || c.id,
      products: pricing?.catalog?.products?.length ?? 0,
      skus: Array.isArray(skus) ? skus.length : skus ? Object.keys(skus).length : 0,
      commitments: pricing?.commitments?.commitments?.length ?? 0,
      images: buyerCatalog?.images?.length ?? 0,
      decks: (c.presentations || []).length,
      lastUpdated,
      ageDays,
      stale: ageDays != null && ageDays > STALE_DAYS,
      live: !!liveInv[c.id],
    };
  }), [clients, liveInv]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <PanelIcon icon={Database} />
        <div>
          <CardTitle>Data pipelines</CardTitle>
          <CardDescription>
            Canonical data per tenant — source of truth is the price-list pipeline; staleness over {STALE_DAYS} days is flagged.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Inventory SKUs</TableHead>
              <TableHead>Commitments</TableHead>
              <TableHead>Catalog images</TableHead>
              <TableHead>Decks</TableHead>
              <TableHead>Inventory updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.products}</TableCell>
                <TableCell>{r.skus}</TableCell>
                <TableCell>{r.commitments}</TableCell>
                <TableCell>{r.images}</TableCell>
                <TableCell>{r.decks}</TableCell>
                <TableCell>
                  {r.lastUpdated ? (
                    <span className="inline-flex items-center gap-2">
                      {r.lastUpdated}
                      {r.stale
                        ? <Badge variant="warning"><AlertTriangle className="mr-1 h-3 w-3" />{r.ageDays}d old</Badge>
                        : <Badge variant="success">fresh</Badge>}
                    </span>
                  ) : (
                    <Badge variant="muted">no data</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-fg-muted">
          To refresh: update the source file in the Custom Price List Creator pipeline, regenerate the per-tenant JSON, redeploy. Never edit pricing by hand.
        </p>
      </CardContent>
    </Card>
  );
}

function PanelIcon({ icon: Icon }) {
  return (
    <div
      className="flex h-10 w-10 flex-none items-center justify-center rounded-base text-brand-primary"
      style={{ background: "color-mix(in srgb, var(--cs-color-brand-primary) 12%, transparent)" }}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}
