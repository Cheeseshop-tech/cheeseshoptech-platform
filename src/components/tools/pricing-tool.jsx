import { Fragment, useEffect, useMemo, useState } from "react";
import { Calculator, Package, Handshake, Search, Share2, ArrowRight, Check, Download, Link as LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { appendHistory, loadHistory } from "@/lib/history.js";
import { seedMovementRecords, seedStatus } from "@/lib/sales-monthly.js";
import { usePricingData } from "@/lib/use-pricing-data.js";
import { useItemsDoc } from "@/lib/use-items-doc.js";
import { getItem } from "@/lib/items.js";
import { QuoteBuilder } from "@/components/tools/quote-builder.jsx";
import { codeImageUrl, isPlaceholderImage, placeholderNote } from "@/lib/images.js";
import * as PC from "@/lib/pricing-core.js";
import * as FC from "@/lib/forecast-core.js";

// The real calendar date, in the REP's timezone. Was a hardcoded "2026-06-06" (flagged
// 2026-07-28): every recorded sale landed in that month's movement bucket and every printed
// proforma carried that date, no matter when it was actually issued. `toISOString()` alone is
// UTC, which rolls a US evening into tomorrow — offset it first so the stamp is the local day.
const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const money = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lbsFmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtDate = (iso) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const titleCase = (s) => String(s || "").toLowerCase().replace(/\b([a-z])/g, (m, c) => c.toUpperCase());

// Product NAME join (DATA_OWNERSHIP_MAP.md, same pattern as studio-director.js pickProducts):
// the canonical item record (Media Hub items.js — identity + copy) wins; catalog.json's own
// `name` is only the fallback for a SKU not yet entered into the items doc (or while the doc
// is still loading / failed to load — itemsDoc may be null and this never breaks).
// Pricing, pack specs and everything else keep coming from catalog.json untouched.
const productName = (itemsDoc, code, product) => titleCase(getItem(itemsDoc, code)?.name || product?.name);

const selCls =
  "rounded-base border border-border bg-bg px-2.5 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
const fieldLabel = "text-[10px] font-semibold uppercase tracking-wide text-fg-muted";

export function PricingTool({ resolved, onNavigate }) {
  const { data, stockSource } = usePricingData(resolved);
  // Canonical item names (Media Hub items.js) — null until loaded; every consumer falls
  // back to catalog.json's name, so the tool renders instantly and never blanks a name.
  const itemsDoc = useItemsDoc(resolved);

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-base border border-dashed border-border bg-surface py-16 text-center">
        <div>
          <Calculator className="mx-auto h-7 w-7 text-fg-muted" />
          <p className="mt-3 font-heading text-lg text-fg">No pricing data for this tenant</p>
          <p className="mt-1 text-sm text-fg-muted">Generate the canonical catalog/inventory and wire the data seam.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-base bg-brand-primary text-brand-on-primary">
          <Calculator className="h-7 w-7" />
        </div>
        <div>
          <h1 className="font-heading text-3xl text-fg">Pricing &amp; Inventory</h1>
          <p className="mt-1 text-fg-muted">
            Wholesale quoting, movement planning, and commitments — one source of truth.
            <span className="ml-2 font-mono text-xs">
              stock {data.inventory.lastUpdated || "—"}
              {stockSource === "live"
                ? <span className="font-semibold" style={{ color: "#16a34a" }}> · live</span>
                : stockSource === "loading" ? <span className="text-fg-muted"> · syncing…</span> : null}
            </span>
          </p>
        </div>
      </div>

      {(data.catalog?.products?.length || 0) === 0 ? (
        <DataIntake />
      ) : (
        <Tabs defaultValue="proforma">
          <TabsList>
            <TabsTrigger value="proforma">Pro Forma</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="shelflife">Shelf Life</TabsTrigger>
            <TabsTrigger value="movement">Movement</TabsTrigger>
            <TabsTrigger value="commitments">Commitments</TabsTrigger>
          </TabsList>
          <TabsContent value="proforma"><Proforma data={data} brand={resolved.brand} resolved={resolved} onNavigate={onNavigate} itemsDoc={itemsDoc} /></TabsContent>
          {/* The one-page branded rate card (docs/QUOTE_BUILDER_SPEC_2026-08-13.md). Deliberately
              its own file — this one is already large, and the Quote Builder shares only the
              pricing engine and the customer/tier vocabulary, not Proforma's order machinery. */}
          <TabsContent value="quotes"><QuoteBuilder data={data} brand={resolved.brand} resolved={resolved} itemsDoc={itemsDoc} /></TabsContent>
          <TabsContent value="shelflife"><ShelfLife data={data} itemsDoc={itemsDoc} /></TabsContent>
          <TabsContent value="movement"><Movement data={data} resolved={resolved} itemsDoc={itemsDoc} /></TabsContent>
          <TabsContent value="commitments"><Commitments data={data} itemsDoc={itemsDoc} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ---------------- Data intake (empty-catalog state) ----------------
   NOT a mock. This is the same encoded app every client runs — until the tenant's data lands,
   it shows its data-connection state: the preferred file formats and the delivery process
   (shared Google Drive file → CST sync → this portal populates; same pipeline as the live
   tenants' weekly availability sync). Runbook: docs/CLIENT_ONBOARDING_GUIDE.md. */
const INTAKE_FILES = [
  { file: "01_Product_Catalog_and_Pricing.xlsx", label: "Product Catalog & Pricing", feeds: "Products, pack specs, list prices, tier rules", cadence: "Once, then on changes" },
  { file: "02_Inventory_Availability.xlsx", label: "Inventory Availability", feeds: "Live stock, lots, expiry — drives the Shelf Life rule", cadence: "Weekly" },
  { file: "03_Standing_Orders_Commitments.xlsx", label: "Standing Orders & Commitments", feeds: "Recurring demand — drives Movement planning", cadence: "Once, then on changes" },
];

function DataIntake() {
  return (
    <div className="rounded-base border border-border bg-surface p-6">
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-brand-primary"
          style={{ background: "color-mix(in srgb, var(--cs-color-brand-primary) 12%, transparent)" }}
        >
          <Share2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-xl text-fg">This portal is live — it's waiting on your data</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            The full quoting, shelf-life, movement and commitments engine is running behind this
            page. It populates the moment your files land. Three steps:
          </p>
        </div>
      </div>

      <ol className="mt-6 grid gap-4 lg:grid-cols-3">
        <li className="rounded-lg border border-border bg-bg p-5">
          <span className="cs-eyebrow text-brand-primary">Step 1 · Download</span>
          <p className="mt-2 text-sm text-fg-muted">
            One template per job, in the format the portal ingests directly. Keep headers as they
            are — one row per item, no merged cells. <b>Item number is the master key</b> across
            every file.
          </p>
          <div className="mt-3 space-y-2">
            {INTAKE_FILES.map((k) => (
              <a key={k.file} href={`/onboarding-kit/${k.file}`} download
                className="group flex items-center gap-2.5 rounded-md border border-border p-2.5 transition-colors hover:border-brand-primary">
                <Download className="h-4 w-4 flex-none text-brand-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{k.label}</span>
                  <span className="block text-xs text-fg-muted">{k.feeds}</span>
                  <span className="cs-eyebrow text-fg-muted">{k.cadence}</span>
                </span>
              </a>
            ))}
          </div>
        </li>
        <li className="rounded-lg border border-border bg-bg p-5">
          <span className="cs-eyebrow text-brand-primary">Step 2 · Fill</span>
          <p className="mt-2 text-sm text-fg-muted">
            Work in Excel or Google Sheets — either is fine. The gray italic example row in each
            sheet shows what good looks like (delete it before sharing). Prices are <b>your</b>{" "}
            numbers: the engine quotes exactly what you set, it never invents pricing.
          </p>
          <p className="mt-3 text-sm text-fg-muted">
            Partial beats perfect — share the catalog as soon as it's ready; inventory and
            commitments can follow.
          </p>
        </li>
        <li className="rounded-lg border border-border bg-bg p-5">
          <span className="cs-eyebrow text-brand-primary">Step 3 · Share via Google Drive</span>
          <p className="mt-2 text-sm text-fg-muted">
            Put the files in a Google Drive folder and share it (view access) with{" "}
            <b>hello@cheeseshoptech.com</b>. That shared file <i>is</i> the pipeline: we sync it
            into the portal — inventory refreshes weekly from the same shared sheet, no
            re-uploads, no rebuilds.
          </p>
          <p className="mt-3 text-sm text-fg-muted">
            Keep working in that same file forever — updates flow through on every sync.
          </p>
        </li>
      </ol>

      <p className="mt-5 border-t border-border pt-4 text-xs text-fg-muted">
        Same delivery process as every live tenant on the platform. Direct in-app upload is on the
        roadmap; the shared-Drive pipeline is the current standard until a client's workflow needs
        something different.
      </p>
    </div>
  );
}

/* ---------------- Proforma ---------------- */
function Proforma({ data, brand, resolved, onNavigate, itemsDoc }) {
  const { config, catalog, inventory, commitments } = data;
  const { toast } = useToast();
  const skus = useMemo(
    () => catalog.products.flatMap((p) =>
      p.skus.map((s) => ({
        ...s,
        category: p.category,
        name: productName(itemsDoc, s.code, p) + " · " + s.packing,
        productName: productName(itemsDoc, s.code, p),
        marketing: p.marketing || {},
      }))),
    [catalog, itemsDoc]
  );
  const cmap = useMemo(() => {
    const m = {}; (commitments.commitments || []).forEach((c) => { if (c.kind === "standing_plan") m[c.skuCode] = c; }); return m;
  }, [commitments]);
  const cust = useMemo(() => {
    const set = new Set(); (commitments.commitments || []).forEach((c) => { if (c.customer) set.add(c.customer); (c.alsoBuy || []).forEach((a) => set.add(a)); });
    return [...set].sort();
  }, [commitments]);

  const [customer, setCustomer] = useState("");
  const [newCust, setNewCust] = useState(false);
  const [openLots, setOpenLots] = useState({});
  const [tierId, setTierId] = useState(config.pricing.defaultTier || config.pricing.tiers[0].id);
  const [basis, setBasis] = useState("pickup");
  const [volumeId, setVolumeId] = useState("");
  const [customPct, setCustomPct] = useState(0);
  const [truckOverride, setTruckOverride] = useState(null); // null = use engine-suggested
  const [procOverride, setProcOverride] = useState(null);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState({});
  const [detail, setDetail] = useState(null); // sku whose product-detail dialog is open
  // Quote valid-until date — REP-SPECIFIED per quote, deliberately NO default window
  // (Rick, 2026-07-16: market is volatile; the rep judges validity per quote). Required
  // before the proforma can be printed/generated (wholesale Phase 1 / audit P0 #5).
  const [validUntil, setValidUntil] = useState("");

  const opts = { tierId, basis, volumeId, customPct };
  // Manifest-first (real catalog image when the code has one), legacy packshot fallback otherwise.
  // Proforma is an INTERNAL surface, so it opts into the low-res reference placeholders (see
  // lib/images.js). Proposals and sell sheets deliberately do not — a buyer never sees one.
  const PH = { allowPlaceholder: true };
  const imgLarge = (code) => codeImageUrl(resolved, config, code, "card", PH);     // row thumbnail (64px, retina)
  const imgPreview = (code) => codeImageUrl(resolved, config, code, "preview", PH); // detail dialog (large, crisp)
  const isPh = (code) => isPlaceholderImage(resolved, code);
  const setCases = (code, v) => setQty((q) => { const n = Math.max(0, Math.floor(Number(v) || 0)); const next = { ...q }; if (n) next[code] = n; else delete next[code]; return next; });

  const visible = skus.filter((s) => !search || (s.code + " " + s.name + " " + s.category).toLowerCase().includes(search.trim().toLowerCase()));
  const items = skus.filter((s) => qty[s.code] > 0).map((s) => ({ sku: s, cases: qty[s.code] }));
  const order = PC.quoteOrder(items, opts, config);

  // Editable freight: default to the engine-suggested amounts (trucking floored at the local
  // minimum, processing per the 1,500 lb rule), but let the rep pick a preset or type any value.
  const suggTruck = order.freight.find((f) => f.id === "trucking")?.amount ?? 0;
  const suggProc = order.freight.find((f) => f.id === "processing")?.amount ?? 0;
  const effTruck = truckOverride != null ? truckOverride : suggTruck;
  const effProc = procOverride != null ? procOverride : suggProc;
  const effFreight = basis === "delivered"
    ? [{ id: "trucking", label: "Trucking (est.)", amount: PC.round2(effTruck) },
       { id: "processing", label: "Processing fee", amount: PC.round2(effProc) }].filter((f) => f.amount > 0)
    : [];
  const grand = PC.round2(order.merchSubtotal + effFreight.reduce((s, f) => s + f.amount, 0));

  const tier = config.pricing.tiers.find((t) => t.id === tierId) || {};
  const gate = config.pricing.freight.thresholdLb;

  function recordSale() {
    if (!items.length) { toast({ title: "Nothing to record", description: "Enter case quantities first.", tone: "warning" }); return; }
    const at = todayISO();
    const recs = items.map((it) => ({ period: at.slice(0, 7), skuCode: it.sku.code, customer: customer || "(unspecified)", soldCases: it.cases, missedCases: 0, at }));
    appendHistory(resolved.id, recs);
    toast({ title: "Sale recorded", description: `${items.length} line(s) added to shared movement history.`, tone: "success" });
  }

  // Print / save-as-PDF: open a clean branded proforma document and trigger print.
  // The printed document IS the quote record: it bakes in the then-current per-SKU prices
  // plus the pricing inputs shown (basis, class of trade, custom %) and the rep-set
  // valid-until date — the price snapshot at generation time (wholesale Phase 1).
  function printProforma() {
    if (!items.length) { toast({ title: "Nothing to print", description: "Enter case quantities first.", tone: "warning" }); return; }
    // Hard stop on unpriced SKUs: the engine returns null for them but quoteLineTotal
    // degrades null to $0 — a proforma must never leave here quoting free cheese.
    if (order.unpricedCodes && order.unpricedCodes.length) {
      toast({ title: "Unpriced item on this quote", description: `No cost on file for ${order.unpricedCodes.join(", ")} — remove the line(s) or get pricing before printing.`, tone: "warning" });
      return;
    }
    if (!validUntil) { toast({ title: "Set a quote valid-until date", description: "Every proforma carries a rep-set validity date — no default window.", tone: "warning" }); return; }
    const brandColor = (brand && brand.colors && brand.colors.primary) || "#064E22";
    const b = (config.brand) || {};
    const rows = order.lines.map((l) => {
      const a = PC.allocate(l.code, l.cases, inventory);
      const lots = a.allocated.map((x) => `${x.cases}cs lot ${x.lotNum}${x.expDate ? " (exp " + fmtDate(x.expDate) + ")" : ""}`).join("; ");
      // Per-line price basis: catch-weight bulk shows $/lb, exact-weight precuts show $/case.
      const per = l.unit === "case" ? "cs" : "lb";
      return `<tr><td>${esc(l.code)}</td><td>${esc(l.name)}</td><td class="r">${l.cases}</td><td class="r">${lbsFmt(l.lbs)}</td><td class="r">${money(l.unitPrice)}<span style="color:#666">/${per}</span></td><td class="r">${money(l.lineTotal)}</td></tr>`
        + (lots ? `<tr class="lot"><td></td><td colspan="5">↳ ${esc(lots)}${a.shortfall > 0 ? ` · <b>${a.shortfall} cs short</b>` : ""}</td></tr>` : "");
    }).join("");
    const fees = effFreight.map((f) => `<tr class="fee"><td colspan="5" class="r">${esc(f.label)}</td><td class="r">${money(f.amount)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Proforma — ${esc(customer || b.name || "")}</title><style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#141413;margin:0;padding:34px;font-size:13px}
      .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${brandColor};padding-bottom:14px;margin-bottom:18px}
      .hd h1{font-family:Georgia,serif;color:${brandColor};margin:0;font-size:26px}.hd .sub{color:#333;font-size:12px}
      .pf{font-size:18px;font-weight:700;color:${brandColor};text-align:right}
      .meta{display:flex;gap:34px;flex-wrap:wrap;margin-bottom:16px;font-size:12px}.meta b{display:block;color:${brandColor};font-size:9px;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px}
      table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;border-bottom:1px solid #ccc;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#333;letter-spacing:.4px}
      td{padding:6px 8px;border-bottom:1px solid #eee}.r{text-align:right}.lot td{color:#333;font-size:11px;border-bottom:1px solid #f6f6f6;padding-top:0}
      .fee td{color:#0E7C9E}tfoot td{font-weight:700;border-top:2px solid ${brandColor};font-size:14px;padding-top:9px}
      tfoot tr.grand td{font-size:17px;color:${brandColor}}.ft{margin-top:32px;color:#1f1f1f;font-size:11px;text-align:center}
    </style></head><body>
      <div class="hd"><div><h1>${esc(b.name || "Monti Trentini")}</h1><div class="sub">${esc(b.tagline || "")}</div></div><div><div class="pf">PROFORMA</div><div class="sub">${todayISO()}</div></div></div>
      <div class="meta"><div><b>Bill to</b>${esc(customer || "—")}</div><div><b>Basis</b>${basis === "pickup" ? "Pickup (EXW)" : "Delivered"}</div><div><b>Class of trade</b>${esc(tier.label || "")}</div>${customPct ? `<div><b>Custom</b>${customPct > 0 ? "+" : ""}${customPct}%</div>` : ""}<div><b>Quote valid until</b><span style="font-weight:700;color:${brandColor}">${esc(fmtDate(validUntil))}</span></div></div>
      <table><thead><tr><th>Item</th><th>Product</th><th class="r">Cases</th><th class="r">Lbs</th><th class="r">Unit price (firm)</th><th class="r">Line total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5" class="r">Merchandise (${order.lines.length} lines · ${lbsFmt(order.totalLbs)} lb)</td><td class="r">${money(order.merchSubtotal)}</td></tr>${fees}<tr class="grand"><td colspan="5" class="r">GRAND TOTAL (estimate)</td><td class="r">${money(grand)}</td></tr></tfoot></table>
      <div class="ft" style="text-align:left;line-height:1.5;max-width:760px;margin-left:auto;margin-right:auto">
        Bulk cheese is quoted <b>per pound (firm $/lb)</b> and sold by <b>catch weight</b> — those line totals are
        <b>estimates based on average weights</b>, confirmed when the order is weighed at our warehouse.
        Exact-weight precuts (7 oz wedges, 12 pieces per case) are quoted <b>per case (firm $/cs)</b> — those line
        totals are firm. The trucking fee shown is an <b>estimate pending confirmation with the logistics
        provider</b>. Processing and logistics are billed as separate line items. <b>Quote valid until ${esc(fmtDate(validUntil))}</b> — request updated pricing after this date. &nbsp;·&nbsp; Casa Finco · casari dal 1925.
      </div>
      <script>window.onload=function(){window.print();}<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Pop-up blocked", description: "Allow pop-ups to print or save the proforma as PDF.", tone: "warning" }); return; }
    w.document.write(html); w.document.close();
  }

  return (
    <div className="space-y-4">
        {/* controls */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Customer</span>
            {!newCust ? (
              <select className={selCls + " min-w-[180px]"} value={customer}
                onChange={(e) => { if (e.target.value === "__new") { setNewCust(true); setCustomer(""); } else setCustomer(e.target.value); }}>
                <option value="">— Select customer —</option>
                {cust.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new">+ New customer…</option>
              </select>
            ) : (
              <div className="flex items-center gap-1">
                <input className={selCls + " min-w-[150px]"} value={customer} autoFocus placeholder="New customer name" onChange={(e) => setCustomer(e.target.value)} />
                <button type="button" title="Back to list" className="rounded-base border border-border px-2 py-2 text-xs text-fg-muted hover:text-fg" onClick={() => { setNewCust(false); setCustomer(""); }}>↩</button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Class of trade</span>
            <select className={selCls} value={tierId} onChange={(e) => setTierId(e.target.value)}>
              {config.pricing.tiers.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.adjustPct >= 0 ? "+" : ""}{t.adjustPct}%)</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Freight basis</span>
            <div className="inline-flex rounded-base border border-border bg-bg p-0.5">
              {["pickup", "delivered"].map((b) => (
                <button key={b} onClick={() => setBasis(b)}
                  className={"rounded-base px-3 py-1.5 text-sm font-medium capitalize " + (basis === b ? "bg-brand-primary text-brand-on-primary" : "text-fg-muted hover:text-fg")}>{b}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Volume break</span>
            <select className={selCls} value={volumeId} onChange={(e) => setVolumeId(e.target.value)}>
              <option value="">— none —</option>
              {config.pricing.volumeBreaks.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.adjustPct >= 0 ? "+" : ""}{v.adjustPct}%)</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Custom ±%</span>
            <input type="number" step="0.5" className={selCls + " w-20"} value={customPct} onChange={(e) => setCustomPct(Number(e.target.value) || 0)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Quote valid until <span className="text-error">*</span></span>
            {/* Rep-specified per quote — intentionally empty by default, never pre-filled. */}
            <input type="date" className={selCls + (validUntil ? "" : " border-warning")} value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          {basis === "delivered" && (
            <>
              <div className="flex flex-col gap-1">
                <span className={fieldLabel}>Trucking $ (est.)</span>
                <input type="number" min="0" step="25" list="truck-presets" className={selCls + " w-28"}
                  value={truckOverride != null ? truckOverride : ""} placeholder={`auto ${suggTruck}`}
                  onChange={(e) => setTruckOverride(e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0))} />
                <datalist id="truck-presets"><option value="300" /><option value="350" /><option value="400" /><option value="500" /><option value="750" /></datalist>
              </div>
              <div className="flex flex-col gap-1">
                <span className={fieldLabel}>Processing $</span>
                <input type="number" min="0" step="5" list="proc-presets" className={selCls + " w-24"}
                  value={procOverride != null ? procOverride : ""} placeholder={`auto ${suggProc}`}
                  onChange={(e) => setProcOverride(e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0))} />
                <datalist id="proc-presets"><option value="135" /><option value="0" /></datalist>
              </div>
            </>
          )}
        </div>

        {/* Summary bar — bill-to + running totals, full-width and sticky so it stays visible while
            scrolling. Moved above the table (was a 340px side rail) so the product list runs the
            full width + length of the window — more rows, no text wrapping. */}
        <div className="sticky top-2 z-10">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
              <div className="min-w-[150px]">
                <p className="text-xs uppercase tracking-wide text-fg-muted">Bill to</p>
                <p className="font-heading text-lg leading-tight text-fg">{customer || <span className="text-fg-muted">No customer</span>}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="muted">{basis === "pickup" ? "Pickup EXW" : "Delivered"}</Badge>
                  <Badge variant="muted">{tier.label}</Badge>
                  {customPct ? <Badge variant="info">{customPct > 0 ? "+" : ""}{customPct}%</Badge> : null}
                </div>
              </div>

              <div className="hidden text-sm sm:block">
                <div className="flex justify-between gap-6"><span className="text-fg-muted">Merchandise <span className="text-xs">({order.lines.length})</span></span><span className="font-mono">{money(order.merchSubtotal)}</span></div>
                {effFreight.map((f) => <div key={f.id} className="flex justify-between gap-6 text-info"><span>{f.label}</span><span className="font-mono">{money(f.amount)}</span></div>)}
                <div className="flex justify-between gap-6 text-fg-muted"><span>Weight</span><span className="font-mono">{lbsFmt(order.totalLbs)} lb{order.totalLbs >= gate ? "" : ` / ${lbsFmt(gate)}`}</span></div>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-base bg-brand-primary px-4 py-2 text-brand-on-primary">
                  <span className="font-heading text-sm">Grand total</span><span className="font-mono text-lg font-semibold">{money(grand)}</span><span className="text-[10px] uppercase tracking-wide opacity-80">est.</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <Button variant="outline" onClick={printProforma} disabled={!validUntil}
                    title={!validUntil ? "Set a quote valid-until date first — every proforma carries one" : undefined}>
                    Print / PDF
                  </Button>
                  {!validUntil && <span className="text-[10px] text-fg-muted">Set “Quote valid until” to print</span>}
                </div>
                <Button variant="primary" onClick={recordSale}>Record sale</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search sits directly above the product list it filters. */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            className="h-10 w-full rounded-base border border-border bg-bg pl-9 pr-3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the price list — SKU code or product name…"
          />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Inventory &amp; lots</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cases</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((s) => {
                const inv = inventory.skus[s.code];
                const cases = qty[s.code] || 0;
                const unit = PC.quoteUnitPrice(s, opts, config);
                const alloc = cases > 0 && inv ? PC.allocate(s.code, cases, inventory) : null;
                const c = cmap[s.code];
                return (
                  <TableRow key={s.code}>
                    <TableCell>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setDetail(s)}
                          title={isPh(s.code) ? "Low-res reference image — awaiting hi-res packshot" : "View product details"}
                          className={"group/img relative h-16 w-16 flex-none overflow-hidden rounded-base border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand "
                            + (isPh(s.code) ? "border-dashed border-fg-muted/60" : "border-border")}
                        >
                          <img loading="lazy" src={imgLarge(s.code)} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                            className="h-full w-full object-contain transition-transform group-hover/img:scale-110" />
                          {/* A dashed border + "REF" corner: never let a 150 ppi thumbnail pass for a packshot. */}
                          {isPh(s.code) && (
                            <span className="absolute bottom-0 right-0 rounded-tl-base bg-fg/70 px-1 text-[9px] font-semibold leading-tight text-white">REF</span>
                          )}
                          <span className="absolute inset-0 flex items-center justify-center bg-fg/0 text-transparent transition-colors group-hover/img:bg-fg/40 group-hover/img:text-white">
                            <Search className="h-4 w-4" />
                          </span>
                        </button>
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-semibold text-brand-primary">{s.code}</span>
                          <div className="font-medium text-fg">{s.name}</div>
                          <div className="text-xs text-fg-muted">{s.category} · {s.unit === "case" && s.pack.piecesPerCase ? `${s.pack.piecesPerCase} pc · ` : ""}{s.pack.netLb} lb/cs</div>
                          {c && <div className="mt-1 text-[11px] font-semibold text-brand-primary">{c.customer} {c.casesPerPeriod}/mo</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {inv ? (
                        <div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className={inv.casesAvail ? "font-medium text-fg" : "text-fg-muted"}>{inv.casesAvail} cs on hand</span>
                            {inv.casesInTransit > 0 && <span className="text-info">⚓ {inv.casesInTransit} cs on the water</span>}
                          </div>
                          {inv.lots && inv.lots.length > 0 && (
                            <>
                              <button type="button" onClick={() => setOpenLots((o) => ({ ...o, [s.code]: !o[s.code] }))}
                                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
                                <span className="inline-block w-3 text-center">{openLots[s.code] ? "▾" : "▸"}</span>
                                {inv.lots.length} lot{inv.lots.length > 1 ? "s" : ""}
                              </button>
                              {openLots[s.code] && (
                                <div className="mt-2 grid w-fit grid-cols-[auto_auto_auto] items-center gap-x-8 gap-y-1.5 font-mono text-xs">
                                  {inv.lots.map((l, i) => (
                                    <Fragment key={i}>
                                      <span className="text-fg-muted">lot {l.lotNum}</span>
                                      <span className="text-right text-fg">{l.status === "in_transit" ? l.cases : l.cases - (l.reserved || 0)} cs</span>
                                      {l.status === "in_transit"
                                        ? <span className="whitespace-nowrap text-info">⚓ ETA {fmtDate(l.eta)}</span>
                                        : <span className="whitespace-nowrap text-fg-muted">exp {fmtDate(l.expDate)}</span>}
                                    </Fragment>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : <span className="text-fg-muted">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {unit == null
                        ? <span className="rounded-base border border-warning/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning" title="No cost on file — price on request">POR</span>
                        : <>{money(unit)}<span className="text-xs text-fg-muted">/{s.unit === "case" ? "cs" : "lb"}</span></>}
                    </TableCell>
                    <TableCell className="text-right">
                      <input type="number" min="0" value={cases || ""} onChange={(e) => setCases(s.code, e.target.value)} placeholder="0"
                        className="w-16 rounded-base border border-border bg-bg px-2 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {cases
                        ? (unit == null
                          ? <span className="text-[11px] font-semibold text-warning">price on request</span>
                          : money(PC.quoteLineTotal(s, cases, opts, config)))
                        : <span className="text-fg-muted">—</span>}
                      {alloc && alloc.shortfall > 0 && <div className="text-[11px] font-semibold text-warning">⚠ {alloc.shortfall} short</div>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <ProductDetailDialog
          sku={detail}
          onClose={() => setDetail(null)}
          imgUrl={detail ? imgPreview(detail.code) : ""}
          imgIsPlaceholder={detail ? isPh(detail.code) : false}
          imgNote={detail ? placeholderNote(detail.code) : ""}
          unit={detail ? PC.quoteUnitPrice(detail, opts, config) : null}
          inv={detail ? inventory.skus[detail.code] : null}
          tierLabel={tier.label}
          onNavigate={onNavigate}
        />
    </div>
  );
}

/* Product detail — opens from the proforma thumbnail. Built for live customer conversations:
   big image + description + the specs and questions a buyer actually asks. */
function ProductDetailDialog({ sku, onClose, imgUrl, imgIsPlaceholder = false, imgNote = "", unit, inv, tierLabel, onNavigate }) {
  const [copied, setCopied] = useState(false);
  if (!sku) return null;
  const m = sku.marketing || {};
  const p = sku.pack || {};
  async function copyLink() {
    try { await navigator.clipboard.writeText(imgUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* blocked */ }
  }
  async function shareImage() {
    const payload = { title: sku.productName, text: m.blurb || sku.productName, url: imgUrl };
    try { if (navigator.share) await navigator.share(payload); else await copyLink(); } catch { /* cancelled */ }
  }
  async function downloadImage() {
    try {
      const res = await fetch(imgUrl, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${sku.code || "product"}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { window.open(imgUrl, "_blank", "noopener"); }
  }
  const chip = "inline-flex items-center gap-1 rounded-base border border-border bg-surface/90 px-2.5 py-1.5 text-xs font-medium text-fg shadow-sm backdrop-blur hover:border-brand-primary";
  const spec = (label, value) => value != null && value !== "" ? (
    <div><dt className="text-[11px] uppercase tracking-wide text-fg-muted">{label}</dt><dd className="text-sm text-fg">{value}</dd></div>
  ) : null;
  return (
    <Dialog open={!!sku} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0">
        <div className="flex max-h-[88vh] flex-col">
          {/* hero photo on top, full width */}
          <div className="relative flex items-center justify-center bg-white p-4 md:rounded-t-base">
            {/* A placeholder is a 150 ppi thumbnail. Don't upscale it into a hero — show it at its
                native size so it reads as a reference, not a photo we'd stand behind. */}
            <img src={imgUrl} alt={sku.productName}
              className={imgIsPlaceholder
                ? "max-h-[220px] w-auto max-w-full object-contain opacity-90"
                : "max-h-[56vh] w-auto max-w-full object-contain"} />
            {/* Share / Download / Copy link are hidden for placeholders on purpose: every one of
                them puts a low-res image in a buyer's hands. Nothing leaves here but a packshot. */}
            {!imgIsPlaceholder && (
              <div className="absolute inset-x-0 bottom-3 flex flex-wrap items-center justify-center gap-1.5 px-3">
                <button type="button" onClick={shareImage} title="Share" className={chip}><Share2 className="h-3.5 w-3.5" /> Share</button>
                <button type="button" onClick={downloadImage} title="Download image" className={chip}><Download className="h-3.5 w-3.5" /> Download</button>
                <button type="button" onClick={copyLink} title="Copy image link" className={chip}>
                  {copied ? <><Check className="h-3.5 w-3.5" style={{ color: "#16a34a" }} /> Copied</> : <><LinkIcon className="h-3.5 w-3.5" /> Copy link</>}
                </button>
              </div>
            )}
          </div>
          {imgIsPlaceholder && (
            <div className="border-y border-border bg-surface px-6 py-2.5 text-xs text-fg-muted">
              <span className="font-semibold text-fg">Reference image only.</span>{" "}
              Low-res thumbnail from the assortment sheet — not a packshot. Not shareable, not for
              print or proposals. Awaiting a hi-res original from the producer.
              {imgNote && <span className="mt-1 block">{imgNote}</span>}
            </div>
          )}

          {/* details below, scrollable */}
          <div className="overflow-y-auto p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-brand-primary">{sku.code}</span>
              {m.badge && <Badge variant="accent">{m.badge}</Badge>}
              {sku.availability && <Badge variant={sku.availability === "in_stock" ? "success" : "muted"}>{sku.availability.replace(/_/g, " ")}</Badge>}
            </div>
            <h2 className="mt-2 font-heading text-2xl text-fg">{sku.productName}</h2>
            <p className="text-sm text-fg-muted">{sku.packing}</p>

            {m.blurb && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg">{m.blurb}</p>}
            {onNavigate && (
              <button type="button" onClick={() => { onClose(); onNavigate("catalog"); }}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline">
                Story &amp; provenance in the catalog <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="mt-4 flex items-baseline gap-2">
              {unit == null ? (
                <>
                  <span className="font-heading text-2xl text-warning">Price on request</span>
                  <span className="text-sm text-fg-muted">no cost on file</span>
                </>
              ) : (
                <>
                  <span className="font-heading text-2xl text-fg">{money(unit)}</span>
                  <span className="text-sm text-fg-muted">/{sku.unit === "case" ? "case" : sku.unit} · {tierLabel}</span>
                </>
              )}
            </div>
            {inv && (
              <p className="mt-1 text-sm text-fg-muted">
                {inv.casesAvail} cs available{inv.casesInTransit > 0 ? ` · ⚓ ${inv.casesInTransit} cs on the water` : ""}
              </p>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
              {spec("Category", sku.category)}
              {spec("Milk", m.milk)}
              {spec("Aging", m.age)}
              {spec("Net / case", p.netLb ? `${p.netLb} lb` : null)}
              {spec("Gross / case", p.grossLb ? `${p.grossLb} lb` : null)}
              {spec("Pieces / case", p.piecesPerCase)}
              {spec("Cases / pallet", p.casesPerPallet)}
              {spec("Pallet Ti×Hi", p.palletTiHi)}
              {spec("Shelf life", p.shelfDays ? `${p.shelfDays} days` : null)}
            </dl>

            {inv && inv.lots && inv.lots.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-fg-muted">Lots</p>
                <div className="grid gap-x-8 gap-y-0.5 sm:grid-cols-2">
                  {inv.lots.map((l, i) => (
                    <div key={i} className="font-mono text-xs text-fg-muted">
                      {l.status === "in_transit"
                        ? <span className="text-info">⚓ lot {l.lotNum} · {l.cases} cs · ETA {fmtDate(l.eta)}</span>
                        : <span>lot {l.lotNum} · {l.cases - (l.reserved || 0)} cs · exp {fmtDate(l.expDate)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Shelf Life (monitoring) ----------------
   Live view of on-hand stock by remaining shelf life. The "move it before < 4 months" rule
   (QUOTING_TOOL_PRINCIPLES §4) made visible: expired / under-4mo / watch buckets, cases at risk,
   soonest-expiry first. Reserved cases are netted out; in-transit is excluded (no firm expiry). */
function ShelfLife({ data, itemsDoc }) {
  const { catalog, inventory } = data;
  const names = useMemo(() => { const m = {}; catalog.products.forEach((p) => p.skus.forEach((s) => (m[s.code] = productName(itemsDoc, s.code, p) + " · " + s.packing))); return m; }, [catalog, itemsDoc]);
  const [filter, setFilter] = useState("active");
  const rows = useMemo(() => {
    const now = new Date(), dayMs = 86400000, out = [];
    for (const code in inventory.skus) {
      const s = inventory.skus[code];
      for (const l of s.lots || []) {
        if (l.status !== "on_hand" || !l.expDate) continue;
        const dleft = Math.round((new Date(l.expDate) - now) / dayMs);
        let bucket = null;
        if (dleft < 0) bucket = "expired";
        else if (dleft <= 122) bucket = "urgent";   // ~4 months
        else if (dleft <= 183) bucket = "watch";    // ~6 months
        if (!bucket) continue;
        out.push({ code, name: names[code] || s.name, lot: l.lotNum, cases: l.cases || 0, reserved: l.reserved || 0, net: (l.cases || 0) - (l.reserved || 0), netLb: l.netAvailLb, exp: l.expDate, dleft, bucket });
      }
    }
    return out.sort((a, b) => a.dleft - b.dleft);
  }, [inventory, names]);

  const counts = { expired: 0, urgent: 0, watch: 0, atRisk: 0 };
  rows.forEach((r) => { counts[r.bucket]++; if ((r.bucket === "expired" || r.bucket === "urgent") && r.net > 0) counts.atRisk += r.net; });
  const shown = rows.filter((r) => (filter === "active" ? true : r.bucket === filter));
  const chips = [["active", "All"], ["expired", "Expired"], ["urgent", "< 4 months"], ["watch", "4–6 months"]];

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Expired lots" value={counts.expired} />
        <Stat label="Under 4 months" value={counts.urgent} />
        <Stat label="Watch (4–6 mo)" value={counts.watch} />
        <Stat label="Cases at risk" value={counts.atRisk} />
      </div>
      <div className="mb-3 inline-flex rounded-base border border-border bg-bg p-0.5">
        {chips.map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={"rounded-base px-3 py-1.5 text-sm font-medium " + (filter === v ? "bg-brand-primary text-brand-on-primary" : "text-fg-muted hover:text-fg")}>{label}</button>
        ))}
      </div>
      <p className="mb-3 rounded-base border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
        On-hand stock by remaining shelf life (live). Goal: move product before it drops under ~4 months for buyers. Reserved cases are netted out; soonest-expiry first.
      </p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead className="text-right">Net cases</TableHead>
              <TableHead className="text-right">Net lb</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r, i) => (
              <TableRow key={r.code + "-" + r.lot + "-" + i}>
                <TableCell><span className="font-mono text-xs font-semibold text-brand-primary">{r.code}</span><div className="font-medium text-fg">{r.name}</div></TableCell>
                <TableCell className="font-mono text-xs text-fg-muted">{r.lot}</TableCell>
                <TableCell className="text-right font-mono">{r.net}{r.reserved ? <span className="text-fg-muted"> /{r.cases}</span> : null}</TableCell>
                <TableCell className="text-right font-mono text-fg-muted">{r.netLb != null ? lbsFmt(r.netLb) : "—"}</TableCell>
                <TableCell className="font-mono text-xs">{fmtDate(r.exp)}</TableCell>
                <TableCell className="text-right">
                  {r.bucket === "expired"
                    ? <span className="text-[12px] font-semibold" style={{ color: "#b91c1c" }}>⛔ Expired {Math.abs(r.dleft)}d</span>
                    : r.bucket === "urgent"
                      ? <Badge variant="warning">⚠ {r.dleft}d left</Badge>
                      : <Badge variant="muted">{r.dleft}d</Badge>}
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 && <TableRow><TableCell colSpan={6}><span className="text-fg-muted">Nothing in this bucket.</span></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------------- Movement ---------------- */
function Movement({ data, resolved, itemsDoc }) {
  const { catalog, inventory, commitments, config } = data;
  const [horizon, setHorizon] = useState(3);
  const names = useMemo(() => { const m = {}; catalog.products.forEach((p) => p.skus.forEach((s) => (m[s.code] = productName(itemsDoc, s.code, p) + " · " + s.packing))); return m; }, [catalog, itemsDoc]);
  // Shared movement history (one mind / one body): the central store merged with local captures.
  const [ledger, setLedger] = useState([]);
  useEffect(() => {
    let alive = true;
    loadHistory(resolved?.id).then((recs) => { if (alive) setLedger(recs); });
    return () => { alive = false; };
  }, [resolved?.id]);
  // Historical monthly seed (gated by data quality in sales-monthly.js) + live rep captures.
  const seedRecs = useMemo(() => seedMovementRecords(resolved?.id), [resolved?.id]);
  const movement = { records: [...seedRecs, ...ledger] };
  // Every SKU we SELL, not just every SKU we happen to have stock rows for. A product with no
  // inventory row is a product we can still be asked to fulfil and still need to forecast —
  // it must not vanish from this table. forecast-core treats a missing inventory row as 0/0.
  const codes = useMemo(() => {
    const set = new Set(Object.keys(inventory.skus));
    catalog.products.forEach((p) => p.skus.forEach((s) => set.add(s.code)));
    return [...set];
  }, [catalog, inventory]);
  const [scope, setScope] = useState("signals"); // "signals" = has demand or stock · "all" = whole catalog
  const rep = FC.report(codes, { commitments, inventory, movement, config }, horizon);
  const hasActivity = (r) => r.hasSignal || r.onHand > 0 || r.inTransit > 0;
  const shownRows = scope === "all" ? rep : rep.filter(hasActivity);
  const dormant = rep.length - rep.filter(hasActivity).length;
  const reorder = rep.filter((r) => r.reorder).length;
  const containers = rep.filter((r) => r.flagContainer).length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-1">
          <Stat label="To reorder" value={reorder} />
          <Stat label="Container pulls" value={containers} />
          <Stat label="On hand" value={lbsFmt(rep.reduce((n, r) => n + r.onHand, 0))} />
          <Stat label="On the water" value={lbsFmt(rep.reduce((n, r) => n + r.inTransit, 0))} />
        </div>
        <label className="flex items-center gap-2 text-xs text-fg-muted">Horizon
          <select className={selCls} value={horizon} onChange={(e) => setHorizon(+e.target.value)}>
            <option value={1}>1 mo</option><option value={3}>3 mo</option><option value={6}>6 mo</option>
          </select>
        </label>
      </div>
      <div className="mb-3 inline-flex rounded-base border border-border bg-bg p-0.5">
        {[["signals", `Active (${rep.length - dormant})`], ["all", `All products (${rep.length})`]].map(([v, label]) => (
          <button key={v} onClick={() => setScope(v)}
            className={"rounded-base px-3 py-1.5 text-sm font-medium " + (scope === v ? "bg-brand-primary text-brand-on-primary" : "text-fg-muted hover:text-fg")}>{label}</button>
        ))}
      </div>
      <p className="mb-3 rounded-base border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
        {ledger.length ? `Using ${ledger.length} captured movement record(s)${seedRecs.length ? ` + ${seedRecs.length} historical` : ""} + standing commitments.` : "No sell-through captured yet — projections are commitment-driven. Run-rate & YoY accrue as reps record sales in Proforma."}
        {seedStatus(resolved?.id) && ` ${seedStatus(resolved?.id)}`}
        {dormant > 0 && ` ${dormant} product(s) have no stock and no demand signal — switch to "All products" to see them.`}
      </p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">On water</TableHead>
              <TableHead className="text-right">Committed/mo</TableHead>
              <TableHead className="text-right">Need ({horizon}mo)</TableHead>
              <TableHead className="text-right">Coverage</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shownRows.slice(0, 200).map((r) => (
              <TableRow key={r.code}>
                <TableCell><span className="font-mono text-xs font-semibold text-brand-primary">{r.code}</span><div className="font-medium text-fg">{names[r.code] || r.code}</div></TableCell>
                <TableCell className="text-right font-mono">{r.onHand}</TableCell>
                <TableCell className="text-right font-mono text-info">{r.inTransit || "—"}</TableCell>
                <TableCell className="text-right font-mono">{r.committedMonthly || "—"}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{r.demand}</TableCell>
                <TableCell className="text-right font-mono" style={{ color: r.gap > 0 ? "var(--color-warning, #b45309)" : undefined }}>{r.gap > 0 ? `−${r.gap}` : `+${Math.abs(r.gap)}`}</TableCell>
                <TableCell>
                  {r.flagContainer ? <Badge variant="info">⚓ Pull container · {r.reorderCases} cs</Badge>
                    : r.reorder ? <Badge variant="warning">↻ Reorder {r.reorderCases} cs</Badge>
                    /* No stock, nothing on the water, no demand — say so. "Covered" would be a lie. */
                    : !hasActivity(r) ? <Badge variant="muted">No stock · no demand</Badge>
                    : <Badge variant="success">Covered</Badge>}
                </TableCell>
              </TableRow>
            ))}
            {shownRows.length === 0 && <TableRow><TableCell colSpan={7}><span className="text-fg-muted">Nothing to show.</span></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      {shownRows.length > 200 && (
        <p className="mt-2 text-xs text-fg-muted">Showing the first 200 of {shownRows.length}.</p>
      )}
    </div>
  );
}

/* ---------------- Commitments ---------------- */
function Commitments({ data, itemsDoc }) {
  const { catalog, commitments } = data;
  const names = useMemo(() => { const m = {}; catalog.products.forEach((p) => p.skus.forEach((s) => (m[s.code] = productName(itemsDoc, s.code, p) + " · " + s.packing))); return m; }, [catalog, itemsDoc]);
  const plans = (commitments.commitments || []).filter((c) => c.kind === "standing_plan");
  const review = commitments._needsReview || [];
  const inactive = (commitments.commitments || []).filter((c) => c.kind === "inactive");

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Standing plans" value={plans.length} />
        <Stat label="Need review" value={review.length} />
        <Stat label="Inactive" value={inactive.length} />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Product</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Cases/mo</TableHead><TableHead>Source note</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((c) => (
              <TableRow key={c.id}>
                <TableCell><span className="font-mono text-xs font-semibold text-brand-primary">{c.skuCode}</span><div className="font-medium text-fg">{names[c.skuCode] || c.skuCode}</div></TableCell>
                <TableCell className="font-medium">{c.customer}{c.alsoBuy && c.alsoBuy.length ? <span className="text-xs text-fg-muted"> +{c.alsoBuy.length}</span> : null}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{c.casesPerPeriod}</TableCell>
                <TableCell className="max-w-sm text-xs italic text-fg-muted">{c.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="mt-3 text-xs text-fg-muted">{review.length} notes flagged for review (parsed partial signal) — confirm in the review workflow.</p>
    </div>
  );
}

