import { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getBrandKit } from "@/lib/brandKit.js";
import { cldUrl } from "@/lib/cloudinary.js";
import { flattenSkus } from "@/lib/proposals.js";
import { appendQuoteLog, loadQuoteLog, lastQuotedPrice, newQuoteId } from "@/lib/quotes-log.js";
import * as PC from "@/lib/pricing-core.js";

/* ============================================================================
   QUOTE BUILDER — the one-page branded rate card (docs/QUOTE_BUILDER_SPEC_2026-08-13.md)

   Three surfaces already do adjacent things; this is a fourth, distinct one:
     Pro Forma  — internal dense working order (case grid, lots, freight)
     Proposal   — buyer-facing multi-page trade deck on a shareable link
     Quote Builder (here) — ONE PAGE, printed/emailed as a PDF: header + optional story
                  panels + one pricing table + footer. "Here is our price list, arranged
                  for this specific conversation."

   Not a case-quantity order and not a deck. Delivery is PRINT ONLY for v1 — a trackable
   shareable link is the Proposal engine's job and is deliberately not duplicated here.

   One engine, three arrangements. The purpose selector swaps the table columns, the header
   framing and the footer copy; SKU picking, pricing and quote logging are shared.

   Everything visual comes from the tenant's BRAND KIT (colors, type, voice, story blocks)
   rather than hardcoded Monti values, so this renders correctly for any future tenant.
   ========================================================================== */

const money = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—");

const selCls =
  "rounded-base border border-border bg-bg px-2.5 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
const fieldLabel = "text-[10px] font-semibold uppercase tracking-wide text-fg-muted";

/* The three arrangements. `dates` lists the date fields this purpose treats as authoritative —
   ALL of them are required before Print is enabled, the same "rep must set it, no default
   window" discipline Pro Forma applies to validUntil (the market moves; the rep judges). */
const PURPOSES = [
  {
    id: "new_customer",
    label: "New Customer Negotiation",
    hint: "The full rate card — story panels on, prices as quoted.",
    dates: [{ key: "validUntil", label: "Quote valid until" }],
    storyDefault: true,
  },
  {
    id: "price_change",
    label: "Price Change Notification",
    hint: "Old price → new price for an existing customer. Story panels off — they've heard the pitch.",
    dates: [{ key: "effectiveDate", label: "Effective date" }],
    storyDefault: false,
  },
  {
    id: "promo",
    label: "Promo Offer",
    hint: "A time-boxed discount off the tier price, with the saving shown.",
    dates: [{ key: "promoStart", label: "Offer starts" }, { key: "promoEnd", label: "Offer ends" }],
    storyDefault: false,
  },
];

/* Which brand-kit story-block audience a class-of-trade tier implies. Explicit for the tiers
   that exist today, heuristic for tiers a future tenant invents, so an unknown tier degrades to
   "show every block" rather than to an empty panel grid. */
function audienceForTier(tier) {
  const id = String(tier?.id || "").toLowerCase();
  const label = String(tier?.label || "").toLowerCase();
  const hay = id + " " + label;
  if (/food\s*service|foodservice|chef|restaurant/.test(hay)) return "foodservice";
  if (/distributor|wholesale/.test(hay)) return "distributor";
  if (/retail|consumer|dtc|e-?comm/.test(hay)) return "retail";
  return "";
}

/* The divider bar's audience label: the tier label without its parenthetical gloss.
   "Wholesale / Distributor (price list)" -> "WHOLESALE / DISTRIBUTOR". */
const audienceLabel = (tier) => String(tier?.label || "").replace(/\s*\([^)]*\)\s*/g, "").trim().toUpperCase();

/* Format & Aging, exactly as the reference one-sheet reads it: the pack description plus the
   aging line off the product's marketing record.
   Both fields come from spreadsheet extractions, so they carry two artifacts a buyer-facing
   document must not: embedded newlines ("Whole Wheels vacuum packed\n- 58 lbS Approx") and
   dash placeholders standing in for "no value" ("—", "-", "n/a"). Collapse the first, drop the
   second — a printed rate card should never read "· —". This is display hygiene only; nothing
   is written back to the catalog. */
const blankish = (s) => !s || /^[\s—–-]*$/.test(s) || /^n\/?a$/i.test(s.trim());
const tidy = (s) => String(s || "").replace(/\s+/g, " ").trim();
const formatAging = (entry) => {
  const parts = [entry?.sku?.packing, entry?.product?.marketing?.age]
    .map(tidy)
    .filter((s) => !blankish(s));
  return parts.join(" · ");
};

/* Big-number emphasis in the story panels — "800 m", "~650,000 kWh", "80%", "1,000 tons" get
   set in the display face, the way the reference sheet does it. Runs AFTER escaping, on
   already-safe text, and only ever wraps a matched run in a span. */
const NUM_UNIT = /(~?\d[\d,.]*\s?(?:kWh|km|metres|meters|tons|ton|lb|kg|m|%)(?![a-z]))/gi;
const emphasizeNumbers = (safeText) => String(safeText).replace(NUM_UNIT, '<span class="num">$1</span>');

export function QuoteBuilder({ data, brand, resolved, itemsDoc }) {
  const { config, catalog, commitments } = data;
  const { toast } = useToast();
  const kit = getBrandKit(resolved);

  const [purposeId, setPurposeId] = useState("new_customer");
  const purpose = PURPOSES.find((p) => p.id === purposeId) || PURPOSES[0];

  // Customer — same pattern as Pro Forma's select + "+ New customer…", sourced from the
  // canonical commitments doc so the two tools name customers identically.
  const customers = useMemo(() => {
    const set = new Set();
    (commitments.commitments || []).forEach((c) => { if (c.customer) set.add(c.customer); (c.alsoBuy || []).forEach((a) => set.add(a)); });
    return [...set].sort();
  }, [commitments]);
  const [customer, setCustomer] = useState("");
  const [newCust, setNewCust] = useState(false);

  const [tierId, setTierId] = useState(config.pricing.defaultTier || config.pricing.tiers[0].id);
  const tier = config.pricing.tiers.find((t) => t.id === tierId) || {};
  const audience = audienceForTier(tier);

  // Dates — one bag, only the keys this purpose declares are read or required.
  const [dates, setDates] = useState({ validUntil: "", effectiveDate: "", promoStart: "", promoEnd: "" });
  const setDate = (k, v) => setDates((d) => ({ ...d, [k]: v }));
  const missingDates = purpose.dates.filter((d) => !dates[d.key]);

  // Header copy. Headline seeds from the brand kit's own words so a rep never faces a blank
  // field, and stays editable so the sheet can be aimed at one conversation.
  const kitHeadline = kit?.storyBlocks?.[0]?.title || kit?.voice?.mantra || "";
  const kitIntro = kit?.storyTopics?.[0]?.line || kit?.voice?.positioningHook || "";
  const [headline, setHeadline] = useState(kitHeadline);
  const [intro, setIntro] = useState(kitIntro);
  const [reason, setReason] = useState(""); // price-change only: "reflecting increased milk and freight costs"

  // Story panels — brand-kit blocks filtered to the audience the tier implies. On by default
  // for a new-customer sheet, off for the other two (an existing customer doesn't need the
  // brand pitch again), toggleable either way. Changing the tier changes which blocks exist,
  // so the selection re-seeds with it rather than silently keeping a now-irrelevant block.
  const [showStory, setShowStory] = useState(purpose.storyDefault);
  const [storyKeys, setStoryKeys] = useState([]);
  const storyPool = useMemo(() => {
    const blocks = kit?.storyBlocks || [];
    if (!audience) return blocks;
    const hit = blocks.filter((b) => (b.audience || []).includes(audience));
    return hit.length ? hit : blocks;
  }, [kit, audience]);
  useEffect(() => {
    setStoryKeys(storyPool.slice(0, 3).map((b) => b.key));
  }, [storyPool]);
  useEffect(() => {
    setShowStory(purpose.storyDefault);
  }, [purpose.storyDefault]);
  const storyBlocks = storyPool.filter((b) => storyKeys.includes(b.key)).slice(0, 3);

  // Promo levers: an order-level discount that rides the engine's existing customPct input
  // (same mechanism as Pro Forma's Custom ±%), plus a per-line override for hand-tuning one item.
  const [promoPct, setPromoPct] = useState(10);

  // SKU picking is a curated multi-select (search → add), not Pro Forma's always-on qty grid:
  // this document is a price list arranged for a conversation, not an order.
  const allSkus = useMemo(() => flattenSkus(catalog, itemsDoc), [catalog, itemsDoc]);
  const [search, setSearch] = useState("");
  // [{ code, prevPrice: "" (price-change manual/auto-filled), promoPrice: "" (per-line override) }]
  const [lines, setLines] = useState([]);
  const selected = useMemo(
    () => lines.map((l) => ({ ...l, entry: allSkus.find((x) => x.sku.code === l.code) })).filter((l) => l.entry),
    [lines, allSkus]
  );

  // The shared quotes-issued log — read for the price-change auto-fill, written on print.
  const [quoteLog, setQuoteLog] = useState([]);
  useEffect(() => {
    let alive = true;
    loadQuoteLog(resolved?.id).then((recs) => { if (alive) setQuoteLog(recs); });
    return () => { alive = false; };
  }, [resolved?.id]);

  const opts = { tierId, basis: config?.pricing?.costBasis, volumeId: "", customPct: 0 };
  const promoOpts = { ...opts, customPct: -Math.abs(Number(promoPct) || 0) };
  const regularPrice = (entry) => PC.quoteUnitPrice(entry.sku, opts, config);
  const promoPrice = (l) => {
    const override = Number(l.promoPrice);
    if (l.promoPrice !== "" && Number.isFinite(override)) return PC.round2(override);
    return PC.quoteUnitPrice(l.entry.sku, promoOpts, config);
  };

  const visible = search.trim()
    ? allSkus.filter((x) => (x.sku.code + " " + x.name + " " + (x.product.category || "") + " " + (x.sku.packing || ""))
        .toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  function addSku(code) {
    if (lines.some((l) => l.code === code)) return;
    // Price Change auto-fill: on ADD, look up the most recent price quoted to this customer for
    // this SKU (any purpose) issued before this notice's effective date. Editable afterwards.
    const prior = purposeId === "price_change"
      ? lastQuotedPrice(quoteLog, customer, code, dates.effectiveDate)
      : null;
    setLines((ls) => [...ls, { code, prevPrice: prior ? String(prior.unitPrice) : "", promoPrice: "" }]);
    setSearch("");
  }
  const removeSku = (code) => setLines((ls) => ls.filter((l) => l.code !== code));
  const setLineField = (code, key, value) =>
    setLines((ls) => ls.map((l) => (l.code === code ? { ...l, [key]: value } : l)));

  /* Re-run the prior-price lookup for every line already on the sheet. The auto-fill fires on
     SKU add, but customer and effective date are usually set in whatever order the rep works in
     — this lets them pull the history in without removing and re-adding each line. */
  function refillPrevious() {
    if (!customer) { toast({ title: "Pick the customer first", description: "Previous prices are looked up per customer.", tone: "warning" }); return; }
    let found = 0;
    setLines((ls) => ls.map((l) => {
      const prior = lastQuotedPrice(quoteLog, customer, l.code, dates.effectiveDate);
      if (!prior) return l;
      found++;
      return { ...l, prevPrice: String(prior.unitPrice) };
    }));
    toast(
      found
        ? { title: `Filled ${found} prior price(s)`, description: "From the shared quotes-issued log.", tone: "success" }
        : { title: "No prior quotes on file", description: `Nothing logged for ${customer} yet — enter the previous prices manually.`, tone: "warning" }
    );
  }

  const unpriced = selected.filter((l) => regularPrice(l.entry) == null).map((l) => l.code);
  // Mixed unit selections would make a single "$ / LB" column header a lie.
  const units = new Set(selected.map((l) => l.entry.sku.unit === "case" ? "case" : "lb"));
  const priceHeader = units.size === 1 ? (units.has("case") ? "$ / CASE" : "$ / LB") : "PRICE";
  const unitSuffix = (entry) => (units.size > 1 ? (entry.sku.unit === "case" ? "/cs" : "/lb") : "");

  const canPrint = selected.length > 0 && !missingDates.length && !unpriced.length
    && (purposeId !== "promo" || !!headline.trim());

  /* ---------------- print ---------------- */
  function printQuote() {
    if (!selected.length) { toast({ title: "Nothing to quote", description: "Add at least one SKU.", tone: "warning" }); return; }
    if (unpriced.length) {
      toast({ title: "Unpriced item on this quote", description: `No cost on file for ${unpriced.join(", ")} — remove the line(s) or get pricing before printing.`, tone: "warning" });
      return;
    }
    if (missingDates.length) {
      toast({ title: `Set ${missingDates.map((d) => d.label.toLowerCase()).join(" and ")}`, description: "Every quote carries a rep-set date — no default window.", tone: "warning" });
      return;
    }
    if (purposeId === "promo" && !headline.trim()) { toast({ title: "Give the promo a headline", description: "e.g. “Late-Summer Alpine Selection”.", tone: "warning" }); return; }

    const html = buildQuoteHtml();
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Pop-up blocked", description: "Allow pop-ups to print or save the quote as PDF.", tone: "warning" }); return; }

    // Log the issued quote BEFORE handing the document to the printer: one record per SKU line,
    // grouped by quoteId. Explicit action, tied to Generate/Print — never fired on keystroke,
    // the same discipline as Pro Forma's recordSale().
    const quoteId = newQuoteId();
    const at = todayISO();
    const records = selected.map((l) => ({
      at, purpose: purposeId, quoteId, customer: customer || "(unspecified)",
      skuCode: l.code,
      unitPrice: purposeId === "promo" ? promoPrice(l) : regularPrice(l.entry),
      unit: l.entry.sku.unit === "case" ? "case" : "lb",
      tierId,
      validUntil: dates.validUntil, effectiveDate: dates.effectiveDate,
      promoStart: dates.promoStart, promoEnd: dates.promoEnd,
    }));
    const stamped = appendQuoteLog(resolved?.id, records);
    setQuoteLog((prev) => prev.concat(stamped));

    w.document.write(html); w.document.close();
    toast({ title: "Quote issued", description: `${records.length} line(s) logged to the shared quotes record.`, tone: "success" });
  }

  function buildQuoteHtml() {
    // Brand tokens, kit-first with the client-config / resolved-brand fallbacks a tenant
    // without a full kit still has. Nothing about Monti is hardcoded here.
    const c = kit?.identity?.colors || {};
    const neutral = (name, fallback) => (c.neutrals || []).find((n) => n.name === name)?.hex || fallback;
    const primary = c.primary?.hex || brand?.colors?.primary || config.brand?.accent || "#064E22";
    const accent = c.accent?.hex || config.brand?.accent || primary;
    const cream = neutral("Heritage Cream", (c.neutrals || [])[0]?.hex || "#FFFBDC");
    const paper = neutral("Casa Paper", "#FFFFFF");
    const ink = neutral("Mountain Ink", "#141413");
    const muted = neutral("Stone Charcoal", "#5f5b58");
    const display = kit?.identity?.type?.display?.cssStack || 'Fraunces, Georgia, serif';
    const ui = kit?.identity?.type?.ui?.cssStack || 'Inter, system-ui, sans-serif';

    const b = config.brand || {};
    const contact = b.contact || {};
    const logoUrl = kit?.identity?.logo?.primary ? cldUrl(kit.identity.logo.primary, "card") : "";
    const motto = kit?.voice?.motto || "";
    const heritage = kit?.voice?.heritage || "";
    const attribution = kit?.attribution || "";
    const basisLabel = config.pricing?.costBasis || "FOB";

    /* ---- header block, per purpose ---- */
    const eyebrow = purposeId === "price_change" ? "PRICE UPDATE NOTICE"
      : purposeId === "promo" ? "LIMITED OFFER"
      : (heritage.replace(/\.$/, "").toUpperCase() || "PRICING");
    const title = purposeId === "price_change"
      ? `Price update for ${customer || "your account"}`
      : headline.trim() || kitHeadline;
    const sub = purposeId === "price_change" ? (reason.trim() || "") : intro.trim();

    const rightLines = [
      `<div class="prep">Prepared for ${esc((customer || "—").toUpperCase())}</div>`,
      `<div class="dim">${esc(b.name || "")} · ${esc(todayISO())}</div>`,
    ];
    if (purposeId === "new_customer") rightLines.push(`<div class="key">Quote valid until ${esc(fmtDate(dates.validUntil))}</div>`);
    if (purposeId === "price_change") rightLines.push(`<div class="key">Effective ${esc(fmtDate(dates.effectiveDate))}</div>`);
    if (purposeId === "promo") rightLines.push(`<div class="key">Offer ${esc(fmtDate(dates.promoStart))} – ${esc(fmtDate(dates.promoEnd))}</div>`);

    /* ---- story panels ---- */
    const panels = showStory && storyBlocks.length
      ? `<div class="panels">${storyBlocks.map((s) =>
          `<div class="panel"><h3>${esc(s.title)}</h3><p>${emphasizeNumbers(esc(s.body))}</p></div>`).join("")}</div>`
      : "";

    /* ---- pricing table, per purpose ---- */
    let head = "", body = "", note = "";
    if (purposeId === "new_customer") {
      note = `All prices per ${units.has("case") && units.size === 1 ? "case" : "pound"}, ${esc(basisLabel)}`;
      head = `<tr><th>Item</th><th>Type</th><th>Format &amp; Aging</th><th>SKU</th><th class="r">${esc(priceHeader)}</th><th class="r">Net Wt / Case</th></tr>`;
      body = selected.map((l) => {
        const e = l.entry, m = e.product.marketing || {};
        const badge = m.badge ? `<span class="badge${/pdo|dop/i.test(m.badge) ? " pdo" : ""}">${esc(m.badge.toUpperCase())}</span>` : "";
        return `<tr><td class="item">${esc(e.name)}</td><td>${badge}</td><td class="spec">${esc(formatAging(e))}</td>`
          + `<td class="sku">#${esc(e.sku.code)}</td>`
          + `<td class="r price">${money(regularPrice(e))}<span class="u">${esc(unitSuffix(e))}</span></td>`
          + `<td class="r wt">${esc(e.sku.pack?.netLb ?? "—")} lb net/case</td></tr>`;
      }).join("");
    } else if (purposeId === "price_change") {
      note = `Merchandise pricing, ${esc(basisLabel)}`;
      head = `<tr><th>Item</th><th>SKU</th><th class="r">Previous</th><th class="r">New</th><th class="r">Change</th><th class="r">Effective</th></tr>`;
      body = selected.map((l) => {
        const e = l.entry;
        const nw = regularPrice(e);
        const pv = l.prevPrice === "" ? null : Number(l.prevPrice);
        const has = pv != null && Number.isFinite(pv) && pv > 0;
        const d = has ? PC.round2(nw - pv) : null;
        const dp = has ? Math.round(((nw - pv) / pv) * 1000) / 10 : null;
        const cls = has ? (d > 0 ? "up" : d < 0 ? "down" : "flat") : "flat";
        const chg = has
          ? `<span class="${cls}">${d > 0 ? "+" : d < 0 ? "−" : ""}${money(Math.abs(d)).replace("$", "$")} · ${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(dp).toFixed(1)}%</span>`
          : `<span class="none">—</span>`;
        return `<tr><td class="item">${esc(e.name)}<div class="spec">${esc(formatAging(e))}</div></td>`
          + `<td class="sku">#${esc(e.sku.code)}</td>`
          + `<td class="r prev">${has ? money(pv) : "<span class='none'>no prior quote</span>"}<span class="u">${esc(unitSuffix(e))}</span></td>`
          + `<td class="r price">${money(nw)}<span class="u">${esc(unitSuffix(e))}</span></td>`
          + `<td class="r">${chg}</td>`
          + `<td class="r wt">${esc(fmtDate(dates.effectiveDate))}</td></tr>`;
      }).join("");
    } else {
      note = `Promotional pricing, ${esc(basisLabel)}`;
      head = `<tr><th>Item</th><th>SKU</th><th class="r">Regular</th><th class="r">Promo</th><th class="r">You Save</th><th>Format</th></tr>`;
      body = selected.map((l) => {
        const e = l.entry;
        const reg = regularPrice(e);
        const pro = promoPrice(l);
        const save = PC.round2(reg - pro);
        const savePct = reg > 0 ? Math.round((save / reg) * 1000) / 10 : 0;
        return `<tr><td class="item">${esc(e.name)}</td>`
          + `<td class="sku">#${esc(e.sku.code)}</td>`
          + `<td class="r prev"><s>${money(reg)}</s><span class="u">${esc(unitSuffix(e))}</span></td>`
          + `<td class="r price">${money(pro)}<span class="u">${esc(unitSuffix(e))}</span></td>`
          + `<td class="r"><span class="down">${money(save)} · ${savePct.toFixed(1)}%</span></td>`
          + `<td class="spec">${esc(formatAging(e))}</td></tr>`;
      }).join("");
    }

    /* ---- footer copy, per purpose ---- */
    const disclaimer = purposeId === "promo"
      ? `Merchandise pricing only (${esc(basisLabel)}); freight &amp; handling quoted as separate line items at order time. Offer valid ${esc(fmtDate(dates.promoStart))}–${esc(fmtDate(dates.promoEnd))}, while supplies last.`
      : purposeId === "price_change"
        ? `Merchandise pricing only (${esc(basisLabel)}); freight &amp; handling quoted as separate line items at order time. New prices take effect ${esc(fmtDate(dates.effectiveDate))}. Questions about this update, contact ${esc(contact.name || contact.ordersEmail || "your representative")}.`
        : `Merchandise pricing only (${esc(basisLabel)}); freight &amp; handling quoted as separate line items at order time. Prices reflect the live ${esc(b.name || "")} price list as of the date above and hold through ${esc(fmtDate(dates.validUntil))}.`;

    const contactLine = [
      contact.ordersEmail ? `<b>Orders:</b> ${esc(contact.ordersEmail)}` : "",
      contact.name ? `<b>Contact:</b> ${esc(contact.name)}` : "",
      contact.phone ? esc(contact.phone) : "",
      contact.company ? esc(contact.company) : "",
      contact.city ? esc(contact.city) : "",
    ].filter(Boolean).join(" &nbsp;·&nbsp; ");

    const dividerParts = [
      `<b>${selected.length} SELECTION${selected.length === 1 ? "" : "S"}</b>`,
      audienceLabel(tier),
      `${esc(basisLabel)} MERCHANDISE PRICING`,
    ].filter(Boolean).join(" &nbsp;·&nbsp; ");

    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(purpose.label)} — ${esc(customer || b.name || "")}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      @page { size: letter portrait; margin: 0.4in; }
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{margin:0;padding:26px 30px 20px;background:${cream};color:${ink};font-family:${ui};font-size:11px;line-height:1.45}
      .num{font-family:${display};font-style:italic;font-size:1.28em;color:${primary};font-weight:600}

      /* header */
      .hd{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
      .hd img{height:62px;width:auto;object-fit:contain}
      .hd .right{text-align:right}
      .prep{font-size:10.5px;font-weight:700;letter-spacing:.09em;color:${primary};text-transform:uppercase}
      .dim{color:${muted};font-size:10px;margin-top:2px}
      .key{color:${accent};font-size:10.5px;font-weight:700;margin-top:4px}
      .eyebrow{margin:16px 0 0;font-size:9.5px;font-weight:700;letter-spacing:.22em;color:${accent};text-transform:uppercase}
      h1{font-family:${display};font-style:italic;font-weight:600;color:${primary};font-size:28px;line-height:1.12;margin:5px 0 0}
      .sub{font-family:${display};font-style:italic;color:${muted};font-size:11.5px;margin:7px 0 0;max-width:78%}

      /* story panels */
      .panels{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:16px}
      .panel{border:1px solid ${accent}55;background:${paper};border-radius:5px;padding:11px 12px}
      .panel h3{margin:0 0 5px;font-size:11.5px;font-weight:700;color:${primary}}
      .panel p{margin:0;font-size:9.5px;line-height:1.5;color:${ink}}

      /* divider bar */
      .divider{margin-top:16px;background:${primary};color:${cream};text-align:center;
        padding:8px 10px;border-radius:4px;font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase}

      /* pricing table */
      .tablehd{display:flex;justify-content:space-between;align-items:baseline;margin:15px 0 7px}
      .tablehd h2{margin:0;font-size:10.5px;font-weight:700;letter-spacing:.19em;color:${primary};text-transform:uppercase}
      .tablehd .note{font-family:${display};font-style:italic;color:${muted};font-size:10px}
      table{width:100%;border-collapse:collapse;border:1px solid ${primary}33;border-radius:5px;overflow:hidden}
      thead th{background:${primary};color:${cream};text-align:left;padding:8px 9px;font-size:8.5px;
        font-weight:700;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
      tbody td{padding:7px 9px;border-bottom:1px solid ${primary}1f;vertical-align:middle}
      tbody tr:nth-child(even){background:${primary}0a}
      tbody tr:last-child td{border-bottom:none}
      .r{text-align:right}
      .item{font-weight:700;color:${primary};font-size:11px}
      .spec{color:${ink};font-size:9.5px;font-weight:400}
      .sku{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:${muted};font-size:9.5px;white-space:nowrap}
      .price{font-weight:700;font-size:11.5px;white-space:nowrap}
      .prev{color:${muted};white-space:nowrap}
      .wt{font-weight:600;white-space:nowrap}
      .u{color:${muted};font-weight:400;font-size:8.5px;margin-left:1px}
      .none{color:${muted};font-style:italic;font-size:9px}
      .up{color:#9A3B1B;font-weight:700;white-space:nowrap}
      .down{color:${accent};font-weight:700;white-space:nowrap}
      .flat{color:${muted};white-space:nowrap}
      .badge{display:inline-block;border-radius:999px;padding:2px 7px;font-size:7.5px;font-weight:700;
        letter-spacing:.09em;background:${primary}14;color:${primary};white-space:nowrap}
      .badge.pdo{background:${accent}24;color:${primary}}

      /* footer */
      .ft{margin-top:14px;display:flex;justify-content:space-between;align-items:flex-end;gap:22px}
      .ft .legal{color:${muted};font-size:8.5px;line-height:1.5;max-width:66%}
      .ft .motto{text-align:right;font-family:${display};font-style:italic;color:${primary};font-size:13px}
      .ft .attr{color:${muted};font-size:8px;font-style:normal;font-family:${ui}}
      .contact{margin-top:9px;border-top:1px solid ${primary}33;padding-top:7px;font-size:8.5px;color:${ink}}
      .contact b{color:${primary}}
    </style></head><body>
      <div class="hd">
        <div>${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(b.name || "")}" onerror="this.style.display='none'">` : `<div class="item" style="font-size:18px">${esc(b.name || "")}</div>`}</div>
        <div class="right">${rightLines.join("")}</div>
      </div>
      <div class="eyebrow">${esc(eyebrow)}</div>
      <h1>${esc(title)}</h1>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ""}
      ${panels}
      <div class="divider">${dividerParts}</div>
      <div class="tablehd"><h2>Pricing &amp; Specifications</h2><span class="note">${note}</span></div>
      <table><thead>${head}</thead><tbody>${body}</tbody></table>
      <div class="ft">
        <div class="legal">${disclaimer}</div>
        <div class="motto">${esc(motto)}${attribution ? `<div class="attr">${esc(attribution)}</div>` : ""}</div>
      </div>
      ${contactLine ? `<div class="contact">${contactLine}</div>` : ""}
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-4">
      {/* purpose selector */}
      <Card>
        <CardContent className="p-4">
          <span className={fieldLabel}>What is this sheet for?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {PURPOSES.map((p) => (
              <button key={p.id} type="button" onClick={() => setPurposeId(p.id)}
                className={"rounded-base border px-3.5 py-2 text-left text-sm transition-colors "
                  + (p.id === purposeId
                    ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                    : "border-border text-fg-muted hover:border-brand-primary hover:text-fg")}>
                <span className="block font-medium">{p.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-fg-muted">{purpose.hint}</p>
        </CardContent>
      </Card>

      {/* fields */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Customer</span>
          {!newCust ? (
            <select className={selCls + " min-w-[180px]"} value={customer}
              onChange={(e) => { if (e.target.value === "__new") { setNewCust(true); setCustomer(""); } else setCustomer(e.target.value); }}>
              <option value="">— Select customer —</option>
              {customers.map((c) => <option key={c} value={c}>{c}</option>)}
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
        {purpose.dates.map((d) => (
          <div key={d.key} className="flex flex-col gap-1">
            <span className={fieldLabel}>{d.label} <span className="text-error">*</span></span>
            {/* Rep-specified per quote — intentionally empty by default, never pre-filled. */}
            <input type="date" className={selCls + (dates[d.key] ? "" : " border-warning")}
              value={dates[d.key]} onChange={(e) => setDate(d.key, e.target.value)} />
          </div>
        ))}
        {purposeId === "promo" && (
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>Promo discount %</span>
            <input type="number" min="0" step="0.5" className={selCls + " w-24"} value={promoPct}
              onChange={(e) => setPromoPct(Math.max(0, Number(e.target.value) || 0))} />
            {/* Rides the engine's customPct input, which is ADDITIVE against the FOB base alongside
                the tier % — exactly like Pro Forma's Custom ±%. So 10% off a +15% tier lands at
                +5%, i.e. ~8.7% below the regular price, not 10%. Say so rather than let the rep
                discover it on the printed sheet; "You save" always prints the true saving. */}
            <span className="text-[10px] text-fg-muted">off the base, like Custom ±%</span>
          </div>
        )}
      </div>

      {/* header copy */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          {purposeId !== "price_change" ? (
            <>
              <div className="flex flex-col gap-1">
                <span className={fieldLabel}>Headline{purposeId === "promo" && <span className="text-error"> *</span>}</span>
                <input className={selCls} value={headline} onChange={(e) => setHeadline(e.target.value)}
                  placeholder={purposeId === "promo" ? "Late-Summer Alpine Selection" : kitHeadline} />
              </div>
              <div className="flex flex-col gap-1">
                <span className={fieldLabel}>Sub-line</span>
                <input className={selCls} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={kitIntro} />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1 md:col-span-2">
              <span className={fieldLabel}>Reason for the change (optional)</span>
              <input className={selCls} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="reflecting increased milk and freight costs" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* story panels */}
      {storyPool.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-fg">
              <input type="checkbox" checked={showStory} onChange={(e) => setShowStory(e.target.checked)}
                className="h-4 w-4 accent-[var(--cs-color-brand-primary)]" />
              Show story panels
              {audience && <Badge variant="muted">{audience}</Badge>}
            </label>
            <p className="mt-1 text-xs text-fg-muted">
              From the brand kit, filtered to the audience this class of trade implies. Up to three print.
            </p>
            {showStory && (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {storyPool.map((s) => {
                  const checked = storyKeys.includes(s.key);
                  const full = !checked && storyKeys.length >= 3;
                  return (
                    <label key={s.key}
                      className={"flex cursor-pointer gap-2 rounded-base border p-2.5 text-xs transition-colors "
                        + (checked ? "border-brand-primary bg-bg" : full ? "border-border opacity-50" : "border-border hover:bg-bg")}>
                      <input type="checkbox" checked={checked} disabled={full}
                        onChange={() => setStoryKeys((k) => checked ? k.filter((x) => x !== s.key) : [...k, s.key])}
                        className="mt-0.5 h-3.5 w-3.5 flex-none accent-[var(--cs-color-brand-primary)]" />
                      <span className="min-w-0">
                        <span className="block font-medium text-fg">{s.title}</span>
                        <span className="mt-0.5 block line-clamp-3 text-fg-muted">{s.body}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SKU picker */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={fieldLabel}>Selections <Badge variant="brand">{selected.length}</Badge></span>
            {purposeId === "price_change" && (
              <Button variant="outline" size="sm" onClick={refillPrevious}>Fill previous prices from history</Button>
            )}
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              className="h-10 w-full rounded-base border border-border bg-bg pl-9 pr-3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the price list to add a SKU — code or product name…" />
          </div>
          {visible.length > 0 && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-base border border-border">
              {visible.slice(0, 40).map((x) => {
                const added = lines.some((l) => l.code === x.sku.code);
                return (
                  <button key={x.sku.code} type="button" disabled={added} onClick={() => addSku(x.sku.code)}
                    className={"flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 "
                      + (added ? "opacity-40" : "hover:bg-bg")}>
                    <Plus className="h-3.5 w-3.5 flex-none text-brand-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{x.name}</span>
                      <span className="block truncate text-xs text-fg-muted">{x.sku.packing}</span>
                    </span>
                    <span className="font-mono text-xs text-fg-muted">#{x.sku.code}</span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* the sheet, as it will print */}
      {selected.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                {purposeId === "new_customer" && <><TableHead>Format &amp; aging</TableHead><TableHead className="text-right">{priceHeader}</TableHead><TableHead className="text-right">Net wt / case</TableHead></>}
                {purposeId === "price_change" && <><TableHead className="text-right">Previous</TableHead><TableHead className="text-right">New</TableHead><TableHead className="text-right">Change</TableHead></>}
                {purposeId === "promo" && <><TableHead className="text-right">Regular</TableHead><TableHead className="text-right">Promo</TableHead><TableHead className="text-right">You save</TableHead></>}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.map((l) => {
                const e = l.entry;
                const reg = regularPrice(e);
                const suffix = e.sku.unit === "case" ? "/cs" : "/lb";
                const pv = l.prevPrice === "" ? null : Number(l.prevPrice);
                const hasPrev = pv != null && Number.isFinite(pv) && pv > 0;
                const pro = purposeId === "promo" ? promoPrice(l) : null;
                return (
                  <TableRow key={l.code}>
                    <TableCell>
                      <div className="font-medium text-fg">{e.name}</div>
                      <div className="text-xs text-fg-muted">{e.product.marketing?.badge ? e.product.marketing.badge + " · " : ""}{tidy(e.sku.packing)}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-fg-muted">#{e.sku.code}</TableCell>

                    {purposeId === "new_customer" && (
                      <>
                        <TableCell className="text-xs text-fg-muted">{blankish(e.product.marketing?.age) ? "—" : tidy(e.product.marketing.age)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {reg == null
                            ? <span className="text-[10px] font-semibold uppercase text-warning">POR</span>
                            : <>{money(reg)}<span className="text-xs text-fg-muted">{suffix}</span></>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-fg-muted">{e.sku.pack?.netLb ?? "—"} lb</TableCell>
                      </>
                    )}

                    {purposeId === "price_change" && (
                      <>
                        <TableCell className="text-right">
                          <input type="number" min="0" step="0.01" value={l.prevPrice}
                            onChange={(ev) => setLineField(l.code, "prevPrice", ev.target.value)}
                            placeholder="none on file"
                            className="w-28 rounded-base border border-border bg-bg px-2 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {reg == null ? <span className="text-[10px] uppercase text-warning">POR</span> : money(reg)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {hasPrev && reg != null
                            ? (() => {
                                const d = PC.round2(reg - pv);
                                const dp = ((reg - pv) / pv) * 100;
                                return <span className={d > 0 ? "text-warning" : d < 0 ? "text-brand-primary" : "text-fg-muted"}>
                                  {d > 0 ? "+" : d < 0 ? "−" : ""}{money(Math.abs(d))} · {d > 0 ? "+" : d < 0 ? "−" : ""}{Math.abs(dp).toFixed(1)}%
                                </span>;
                              })()
                            : <span className="text-xs italic text-fg-muted">no prior quote on file — enter manually</span>}
                        </TableCell>
                      </>
                    )}

                    {purposeId === "promo" && (
                      <>
                        <TableCell className="text-right font-mono text-fg-muted">
                          {reg == null ? <span className="text-[10px] uppercase text-warning">POR</span> : <s>{money(reg)}</s>}
                        </TableCell>
                        <TableCell className="text-right">
                          <input type="number" min="0" step="0.01" value={l.promoPrice}
                            onChange={(ev) => setLineField(l.code, "promoPrice", ev.target.value)}
                            placeholder={pro == null ? "" : String(pro)}
                            title="Leave blank to use the order-level promo discount; type a price to hand-tune this one line."
                            className="w-28 rounded-base border border-border bg-bg px-2 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {reg == null || pro == null ? "—"
                            : <span className="font-semibold text-brand-primary">{money(PC.round2(reg - pro))} · {(reg > 0 ? ((reg - pro) / reg) * 100 : 0).toFixed(1)}%</span>}
                        </TableCell>
                      </>
                    )}

                    <TableCell className="text-right">
                      <button type="button" onClick={() => removeSku(l.code)} title="Remove from this quote"
                        className="rounded-base p-1 text-fg-muted hover:text-error"><X className="h-4 w-4" /></button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* generate */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-base border border-border bg-surface p-4">
        <div className="text-sm text-fg-muted">
          {selected.length === 0
            ? "Add SKUs to build the sheet."
            : <>
                <b className="text-fg">{selected.length}</b> selection{selected.length === 1 ? "" : "s"}
                {" · "}{audienceLabel(tier) || tier.label}
                {" · "}{config.pricing?.costBasis || "FOB"}
                {unpriced.length > 0 && <span className="ml-2 font-semibold text-warning">No cost on file for {unpriced.join(", ")}</span>}
              </>}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Button variant="primary" onClick={printQuote} disabled={!canPrint}>
            <FileText className="mr-1.5 h-4 w-4" /> Generate / Print
          </Button>
          {!canPrint && selected.length > 0 && (
            <span className="text-[10px] text-fg-muted">
              {unpriced.length ? "Remove the unpriced line(s) to print"
                : missingDates.length ? `Set ${missingDates.map((d) => d.label.toLowerCase()).join(" and ")} to print`
                : "Give the promo a headline to print"}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-fg-muted">
        Printing logs one record per line to the shared quotes-issued store — that record is what
        auto-fills “Previous” on a future Price Change Notification for this customer.
        Print/PDF only: a trackable shareable link is the Proposal builder's job.
      </p>
    </div>
  );
}
