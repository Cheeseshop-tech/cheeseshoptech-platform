import { useMemo, useState } from "react";
import { Users, PlugZap, Database, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, CircleDashed } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { listClients } from "@/lib/clientConfig.js";
import { getPricingData } from "@/lib/pricing.js";
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
        <TenantPanel clients={clients} onNavigate={onNavigate} />
        <IntegrationPanel clients={clients} />
        <PipelinePanel clients={clients} />
      </div>
    </div>
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
  { key: "crm", label: "CRM", flag: ENV.VITE_CRM_BACKEND || "mock", liveWhen: "make" },
  { key: "store", label: "Storefront", flag: ENV.VITE_STORE_BACKEND || "mock", liveWhen: "shopify" },
  { key: "media", label: "Media", flag: ENV.VITE_MEDIA_BACKEND || "mock", liveWhen: "cloudinary" },
  { key: "campaigns", label: "Campaigns", flag: ENV.VITE_CAMPAIGNS_BACKEND || "mock", liveWhen: "make" },
  { key: "pricing", label: "Pricing data", flag: ENV.VITE_PRICING_BACKEND || "mock", liveWhen: "function" },
];

function IntegrationPanel({ clients }) {
  const [gate, setGate] = useState(null); // null | "checking" | "ok" | "missing" | "unreachable"

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
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------- Data pipelines ---------------- */

const STALE_DAYS = 14;

function PipelinePanel({ clients }) {
  const rows = useMemo(() => clients.map((c) => {
    const pricing = getPricingData({ id: c.id });
    const buyerCatalog = getBuyerCatalog({ id: c.id });
    const lastUpdated = pricing?.inventory?.lastUpdated || null;
    const ageDays = lastUpdated ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 86400000) : null;
    const skus = pricing?.inventory?.skus;
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
    };
  }), [clients]);

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
