import { useEffect, useMemo, useState } from "react";
import { Users, PlugZap, Database, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, CircleDashed } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { listClients } from "@/lib/clientConfig.js";
import { getPricingData, fetchInventory } from "@/lib/pricing.js";
import { getBuyerCatalog } from "@/lib/catalog.js";

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
        <CrmSnapshotPanel />
        <TenantPanel clients={clients} onNavigate={onNavigate} />
        <IntegrationPanel clients={clients} />
        <PipelinePanel clients={clients} />
      </div>
    </div>
  );
}

/* ---------------- CRM snapshot (live, read-only HubSpot) ---------------- */

// Auto-loads on mount from the read-only crm-summary function (HubSpot via the service key, server-side).
// Falls back gracefully to "—"/unavailable in dev (no functions) or if the token/scopes aren't set.
function CrmSnapshotPanel() {
  const [state, setState] = useState("loading"); // "loading" | "error" | { counts }
  useEffect(() => {
    let alive = true;
    fetch("/.netlify/functions/crm-summary")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (alive) setState(d?.counts ? d : "error"); })
      .catch(() => { if (alive) setState("error"); });
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
// Build-time backend switches: what each seam is wired to in THIS build.
const SEAMS = [
  { key: "crm", label: "CRM", flag: ENV.VITE_CRM_BACKEND || "mock", liveWhen: "hubspot" },
  { key: "store", label: "Storefront", flag: ENV.VITE_STORE_BACKEND || "mock", liveWhen: "shopify" },
  { key: "media", label: "Media", flag: ENV.VITE_MEDIA_BACKEND || "mock", liveWhen: "cloudinary" },
  { key: "campaigns", label: "Campaigns", flag: ENV.VITE_CAMPAIGNS_BACKEND || "mock", liveWhen: "make" },
  { key: "signals", label: "Market signals", flag: ENV.VITE_SIGNALS_BACKEND || "mock", liveWhen: "function" },
  { key: "pricing", label: "Pricing data", flag: ENV.VITE_PRICING_BACKEND || "mock", liveWhen: "function" },
];

function IntegrationPanel({ clients }) {
  const [gate, setGate] = useState(null); // null | "checking" | "ok" | "missing" | "unreachable"
  const [crm, setCrm] = useState(null); // null | "checking" | "error" | { counts }

  // Read-only direct-HubSpot check (separate from the Make seam). Returns live contact/company/deal totals.
  async function pingCrm() {
    setCrm("checking");
    try {
      const res = await fetch("/.netlify/functions/crm-summary");
      const data = await res.json().catch(() => null);
      setCrm(res.ok && data?.counts ? data : "error");
    } catch {
      setCrm("error");
    }
  }

  async function pingGate() {
    setGate("checking");
    try {
      // An empty passcode never unlocks anything; the status code reveals configuration:
      // 401 = function up + PORTAL_PASSCODE set · 500 = env var missing · network error = no functions (dev).
      const res = await fetch("/.netlify/functions/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode: "" }),
      });
      setGate(res.status === 401 ? "ok" : res.status === 500 ? "missing" : "unreachable");
    } catch {
      setGate("unreachable");
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
              return (
                <TableRow key={s.key}>
                  <TableCell className="font-medium">{s.label}</TableCell>
                  <TableCell><code className="font-mono text-xs">{s.flag}</code></TableCell>
                  <TableCell>
                    {live
                      ? <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />live</Badge>
                      : <Badge variant="muted"><CircleDashed className="mr-1 h-3 w-3" />mock</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-fg-muted">
                    {s.key === "crm" && clients.some((c) => c.crm === "hubspot") ? "Monti = HubSpot; wire Make once deals exist (CRM_CONNECTOR.md)" : ""}
                    {s.key === "store" && !live ? "Needs real Shopify store + tokens (Phase D / STOREFRONT_STRATEGY.md)" : ""}
                    {s.key === "media" && "Cloudinary delivery; archive layer = spec §6"}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell className="font-medium">Passcode gate</TableCell>
              <TableCell><code className="font-mono text-xs">{ENV.VITE_AUTH_MODE || "identity"}</code></TableCell>
              <TableCell>
                {gate === "ok" && <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />configured</Badge>}
                {gate === "missing" && <Badge variant="error"><AlertTriangle className="mr-1 h-3 w-3" />env missing</Badge>}
                {gate === "unreachable" && <Badge variant="warning">no functions (dev?)</Badge>}
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
                {crm === "checking" && <Badge variant="muted">checking…</Badge>}
                {crm === null && <Badge variant="muted">untested</Badge>}
              </TableCell>
              <TableCell className="text-xs text-fg-muted">
                <span className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={pingCrm}><RefreshCw className="h-3.5 w-3.5" /> Test</Button>
                  {crm && typeof crm === "object" && <span className="text-fg">{crm.counts?.contacts ?? "—"} contacts · {crm.counts?.companies ?? "—"} cos · {crm.counts?.deals ?? "—"} deals</span>}
                  {crm === "error" && <span className="text-error">check token / scopes</span>}
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
