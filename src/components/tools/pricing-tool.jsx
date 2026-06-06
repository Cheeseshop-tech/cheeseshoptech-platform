import { useMemo, useState } from "react";
import { Calculator, Package, Handshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getPricingData, appendLedger } from "@/lib/pricing.js";
import * as PC from "@/lib/pricing-core.js";
import * as FC from "@/lib/forecast-core.js";

const TODAY = "2026-06-06";
const money = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lbsFmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtDate = (iso) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const titleCase = (s) => String(s || "").toLowerCase().replace(/\b([a-z])/g, (m, c) => c.toUpperCase());

const selCls =
  "rounded-base border border-border bg-bg px-2.5 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
const fieldLabel = "text-[10px] font-semibold uppercase tracking-wide text-fg-muted";

export function PricingTool({ resolved }) {
  const data = useMemo(() => getPricingData(resolved), [resolved.id]);

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
            <span className="ml-2 font-mono text-xs">stock {data.inventory.lastUpdated || "—"}</span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="proforma">
        <TabsList>
          <TabsTrigger value="proforma">Proforma</TabsTrigger>
          <TabsTrigger value="movement">Movement</TabsTrigger>
          <TabsTrigger value="commitments">Commitments</TabsTrigger>
        </TabsList>
        <TabsContent value="proforma"><Proforma data={data} brand={resolved.brand} /></TabsContent>
        <TabsContent value="movement"><Movement data={data} /></TabsContent>
        <TabsContent value="commitments"><Commitments data={data} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Proforma ---------------- */
function Proforma({ data, brand }) {
  const { config, catalog, inventory, commitments } = data;
  const { toast } = useToast();
  const skus = useMemo(
    () => catalog.products.flatMap((p) =>
      p.skus.map((s) => ({ ...s, category: p.category, name: titleCase(p.name) + " · " + s.packing }))),
    [catalog]
  );
  const cmap = useMemo(() => {
    const m = {}; (commitments.commitments || []).forEach((c) => { if (c.kind === "standing_plan") m[c.skuCode] = c; }); return m;
  }, [commitments]);
  const cust = useMemo(() => {
    const set = new Set(); (commitments.commitments || []).forEach((c) => { if (c.customer) set.add(c.customer); (c.alsoBuy || []).forEach((a) => set.add(a)); });
    return [...set].sort();
  }, [commitments]);

  const [customer, setCustomer] = useState("");
  const [tierId, setTierId] = useState(config.pricing.defaultTier || config.pricing.tiers[0].id);
  const [basis, setBasis] = useState("pickup");
  const [volumeId, setVolumeId] = useState("");
  const [customPct, setCustomPct] = useState(0);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState({});

  const opts = { tierId, basis, volumeId, customPct };
  const cloud = config.images || {};
  const img = (code) => cloud.cloud ? `https://res.cloudinary.com/${cloud.cloud}/image/upload/f_auto,q_auto,c_fill,w_96/${cloud.folder}/${code}.jpg` : "";
  const setCases = (code, v) => setQty((q) => { const n = Math.max(0, Math.floor(Number(v) || 0)); const next = { ...q }; if (n) next[code] = n; else delete next[code]; return next; });

  const visible = skus.filter((s) => !search || (s.code + " " + s.name + " " + s.category).toLowerCase().includes(search.trim().toLowerCase()));
  const items = skus.filter((s) => qty[s.code] > 0).map((s) => ({ sku: s, cases: qty[s.code] }));
  const order = PC.quoteOrder(items, opts, config);

  const tier = config.pricing.tiers.find((t) => t.id === tierId) || {};
  const gate = config.pricing.freight.thresholdLb;

  function recordSale() {
    if (!items.length) { toast({ title: "Nothing to record", description: "Enter case quantities first.", tone: "warning" }); return; }
    const recs = items.map((it) => ({ period: TODAY.slice(0, 7), skuCode: it.sku.code, customer: customer || "(unspecified)", soldCases: it.cases, missedCases: 0, at: TODAY }));
    appendLedger(recs);
    toast({ title: "Sale recorded", description: `${items.length} line(s) added to the movement ledger.`, tone: "success" });
  }

  // Print / save-as-PDF: open a clean branded proforma document and trigger print.
  function printProforma() {
    if (!items.length) { toast({ title: "Nothing to print", description: "Enter case quantities first.", tone: "warning" }); return; }
    const brandColor = (brand && brand.colors && brand.colors.primary) || "#064E22";
    const b = (config.brand) || {};
    const rows = order.lines.map((l) => {
      const a = PC.allocate(l.code, l.cases, inventory);
      const lots = a.allocated.map((x) => `${x.cases}cs lot ${x.lotNum}${x.expDate ? " (exp " + fmtDate(x.expDate) + ")" : ""}`).join("; ");
      return `<tr><td>${esc(l.code)}</td><td>${esc(l.name)}</td><td class="r">${l.cases}</td><td class="r">${lbsFmt(l.lbs)}</td><td class="r">${money(l.unitPrice)}</td><td class="r">${money(l.lineTotal)}</td></tr>`
        + (lots ? `<tr class="lot"><td></td><td colspan="5">↳ ${esc(lots)}${a.shortfall > 0 ? ` · <b>${a.shortfall} cs short</b>` : ""}</td></tr>` : "");
    }).join("");
    const fees = order.freight.map((f) => `<tr class="fee"><td colspan="5" class="r">${esc(f.label)}</td><td class="r">${money(f.amount)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Proforma — ${esc(customer || b.name || "")}</title><style>
      *{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#141413;margin:0;padding:34px;font-size:13px}
      .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${brandColor};padding-bottom:14px;margin-bottom:18px}
      .hd h1{font-family:Georgia,serif;color:${brandColor};margin:0;font-size:26px}.hd .sub{color:#777;font-size:12px}
      .pf{font-size:18px;font-weight:700;color:${brandColor};text-align:right}
      .meta{display:flex;gap:34px;flex-wrap:wrap;margin-bottom:16px;font-size:12px}.meta b{display:block;color:${brandColor};font-size:9px;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px}
      table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;border-bottom:1px solid #ccc;padding:7px 8px;font-size:9px;text-transform:uppercase;color:#777;letter-spacing:.4px}
      td{padding:6px 8px;border-bottom:1px solid #eee}.r{text-align:right}.lot td{color:#777;font-size:11px;border-bottom:1px solid #f6f6f6;padding-top:0}
      .fee td{color:#0E7C9E}tfoot td{font-weight:700;border-top:2px solid ${brandColor};font-size:14px;padding-top:9px}
      tfoot tr.grand td{font-size:17px;color:${brandColor}}.ft{margin-top:32px;color:#999;font-size:11px;text-align:center}
    </style></head><body>
      <div class="hd"><div><h1>${esc(b.name || "Monti Trentini")}</h1><div class="sub">${esc(b.tagline || "")}</div></div><div><div class="pf">PROFORMA</div><div class="sub">${TODAY}</div></div></div>
      <div class="meta"><div><b>Bill to</b>${esc(customer || "—")}</div><div><b>Basis</b>${basis === "pickup" ? "Pickup (EXW)" : "Delivered"}</div><div><b>Class of trade</b>${esc(tier.label || "")}</div>${customPct ? `<div><b>Custom</b>${customPct > 0 ? "+" : ""}${customPct}%</div>` : ""}</div>
      <table><thead><tr><th>Item</th><th>Product</th><th class="r">Cases</th><th class="r">Lbs</th><th class="r">$/lb</th><th class="r">Line total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5" class="r">Merchandise (${order.lines.length} lines · ${lbsFmt(order.totalLbs)} lb)</td><td class="r">${money(order.merchSubtotal)}</td></tr>${fees}<tr class="grand"><td colspan="5" class="r">GRAND TOTAL</td><td class="r">${money(order.grandTotal)}</td></tr></tfoot></table>
      <div class="ft">Casa Finco · casari dal 1925 — quote valid 30 days. Freight is estimated and confirmed at booking.</div>
      <script>window.onload=function(){window.print();}<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Pop-up blocked", description: "Allow pop-ups to print or save the proforma as PDF.", tone: "warning" }); return; }
    w.document.write(html); w.document.close();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div>
        {/* controls */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Customer</span>
            <input list="cust-list" className={selCls + " min-w-[180px]"} value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Select or type…" />
            <datalist id="cust-list">{cust.map((c) => <option key={c} value={c} />)}</datalist>
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
          <div className="ml-auto flex flex-col gap-1">
            <span className={fieldLabel}>Search</span>
            <input className={selCls + " w-44"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SKU, name…" />
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">$/lb</TableHead>
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
                        <img loading="lazy" src={img(s.image)} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                          className="h-11 w-11 flex-none rounded-base border border-border object-cover" />
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-semibold text-brand-primary">{s.code}</span>
                          <div className="font-medium text-fg">{s.name}</div>
                          <div className="text-xs text-fg-muted">{s.category} · {s.pack.netLb} lb/cs</div>
                          {c && <div className="mt-1 text-[11px] font-semibold text-brand-primary">{c.customer} {c.casesPerPeriod}/mo</div>}
                          {inv && inv.lots && inv.lots.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {inv.lots.map((l, i) => (
                                <div key={i} className="font-mono text-[10px] leading-tight text-fg-muted">
                                  {l.status === "in_transit"
                                    ? <span className="text-info">⚓ lot {l.lotNum} · {l.cases} cs · ETA {fmtDate(l.eta)}</span>
                                    : <span>lot {l.lotNum} · {l.cases - (l.reserved || 0)} cs · exp {fmtDate(l.expDate)}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {inv ? <span className={inv.casesAvail ? "text-fg" : "text-fg-muted"}>{inv.casesAvail} cs</span> : <span className="text-fg-muted">—</span>}
                      {inv && inv.casesInTransit > 0 && <div className="text-[11px] text-info">⚓ {inv.casesInTransit} cs</div>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{money(unit)}</TableCell>
                    <TableCell className="text-right">
                      <input type="number" min="0" value={cases || ""} onChange={(e) => setCases(s.code, e.target.value)} placeholder="0"
                        className="w-16 rounded-base border border-border bg-bg px-2 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {cases ? money(PC.quoteLineTotal(s, cases, opts, config)) : <span className="text-fg-muted">—</span>}
                      {alloc && alloc.shortfall > 0 && <div className="text-[11px] font-semibold text-warning">⚠ {alloc.shortfall} short</div>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* proforma rail */}
      <div className="lg:sticky lg:top-4 h-fit">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-fg-muted">Bill to</p>
            <p className="font-heading text-xl text-fg">{customer || <span className="text-fg-muted">No customer</span>}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="muted">{basis === "pickup" ? "Pickup EXW" : "Delivered"}</Badge>
              <Badge variant="muted">{tier.label}</Badge>
              {customPct ? <Badge variant="info">{customPct > 0 ? "+" : ""}{customPct}%</Badge> : null}
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-fg-muted"><span>Order weight</span><span className="font-mono">{lbsFmt(order.totalLbs)} lb</span></div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg">
                <div className="h-full bg-brand-primary transition-all" style={{ width: Math.min(100, (order.totalLbs / gate) * 100) + "%" }} />
              </div>
              <p className="mt-1 text-[11px] text-fg-muted">
                {order.totalLbs >= gate ? `Over ${lbsFmt(gate)} lb — delivered freight $0.30/lb` : `Freight gate at ${lbsFmt(gate)} lb`}
              </p>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span className="text-fg-muted">Merchandise <span className="text-xs">({order.lines.length} lines)</span></span><span className="font-mono font-medium">{money(order.merchSubtotal)}</span></div>
              {order.freight.map((f) => <div key={f.id} className="flex justify-between text-info"><span>{f.label}</span><span className="font-mono">{money(f.amount)}</span></div>)}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-base bg-brand-primary px-3 py-2.5 text-brand-on-primary">
              <span className="font-heading">Grand total</span><span className="font-mono text-lg font-semibold">{money(order.grandTotal)}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={printProforma}>Print / PDF</Button>
              <Button variant="primary" className="flex-1" onClick={recordSale}>Record sale</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Movement ---------------- */
function Movement({ data }) {
  const { catalog, inventory, commitments, config } = data;
  const [horizon, setHorizon] = useState(3);
  const names = useMemo(() => { const m = {}; catalog.products.forEach((p) => p.skus.forEach((s) => (m[s.code] = titleCase(p.name) + " · " + s.packing))); return m; }, [catalog]);
  let ledger = []; try { ledger = JSON.parse(localStorage.getItem("mt-movement-ledger")) || []; } catch { ledger = []; }
  const movement = { records: ledger };
  const codes = Object.keys(inventory.skus);
  const rep = FC.report(codes, { commitments, inventory, movement, config }, horizon).filter((r) => r.hasSignal || r.onHand > 0 || r.inTransit > 0);
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
      <p className="mb-3 rounded-base border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
        {ledger.length ? `Using ${ledger.length} captured movement record(s) + standing commitments.` : "No sell-through captured yet — projections are commitment-driven. Run-rate & YoY accrue as reps record sales in Proforma."}
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
            {rep.slice(0, 60).map((r) => (
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
                    : <Badge variant="success">Covered</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ---------------- Commitments ---------------- */
function Commitments({ data }) {
  const { catalog, commitments } = data;
  const names = useMemo(() => { const m = {}; catalog.products.forEach((p) => p.skus.forEach((s) => (m[s.code] = titleCase(p.name) + " · " + s.packing))); return m; }, [catalog]);
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

function Stat({ label, value }) {
  return (
    <Card><CardContent className="p-4">
      <p className="cs-display text-3xl text-fg">{value}</p>
      <p className="cs-eyebrow mt-1.5 text-fg-muted">{label}</p>
    </CardContent></Card>
  );
}
