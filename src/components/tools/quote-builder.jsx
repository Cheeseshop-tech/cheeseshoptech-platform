import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Check, X, FileText, Lock, Unlock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getBrandKit } from "@/lib/brandKit.js";
import { codeImageUrl, isPlaceholderImage, brandAssetUrl } from "@/lib/images.js";
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

  /* ---- Pricing method (Rick, 2026-08-13) ------------------------------------------------------
     Two controls that both "speak to" the price: the class of trade, and how the uplift over cost
     is expressed. The class-of-trade tiers are preset uplifts on FOB (+0 / +15 / +35). This adds
     the option to type your own figure instead, in either of the two ways the trade actually
     quotes it — and they are NOT the same arithmetic:

       Markup %        price = cost × (1 + p/100)        25% on $8.00 = $10.00
       Gross margin %  price = cost ÷ (1 − p/100)        25% on $8.00 = $10.67

     Gross margin is the share of the SELLING price that is profit; markup is the share of the
     COST added on. Quoting one as if it were the other is the classic way to give away margin,
     so they are separate options rather than one field with a label.

     A manual figure REPLACES the tier's preset percentage — that is what "manual rather than a
     pre-determined figure" means — and both are computed off the same FOB cost, never stacked
     (stacking would compound an uplift on an uplift). The class-of-trade dropdown still sets the
     audience label printed on the sheet in every mode. */
  const PRICE_MODES = [
    { id: "tier", label: "Class of trade %", hint: "use the preset for the selected class of trade" },
    { id: "markup", label: "Markup % on cost", hint: "price = cost × (1 + p/100)" },
    { id: "margin", label: "Gross profit margin %", hint: "price = cost ÷ (1 − p/100)" },
  ];
  const [priceMode, setPriceMode] = useState("tier");
  const [manualPct, setManualPct] = useState(30);

  /* The raw FOB cost for a SKU, straight out of the engine: quoteUnitPrice with no tier, no
     volume break and no custom % returns the base unchanged, and it already handles the
     $/lb vs $/case split (cost.fob vs cost.fobCase). null = no cost on file. */
  const baseCost = (sku) => PC.quoteUnitPrice(sku, { tierId: "", volumeId: "", customPct: 0 }, config);

  const manualValid = priceMode === "tier"
    || (Number.isFinite(Number(manualPct)) && (priceMode === "markup" ? Number(manualPct) >= 0 : Number(manualPct) >= 0 && Number(manualPct) < 100));

  function priceFor(sku) {
    if (priceMode === "tier") return PC.quoteUnitPrice(sku, opts, config);
    const base = baseCost(sku);
    if (base == null) return null;
    const p = Number(manualPct);
    if (!Number.isFinite(p)) return null;
    if (priceMode === "markup") return PC.round2(base * (1 + p / 100));
    // Gross margin: a 100% margin is a divide-by-zero and anything above it is nonsense.
    if (p >= 100 || p < 0) return null;
    return PC.round2(base / (1 - p / 100));
  }

  const regularPrice = (entry) => priceFor(entry.sku);

  /* ---- Per-line CUSTOM PRICE (Rick, 2026-08-21) -----------------------------------------------
     A rep negotiating live needs to put one number on one line without touching the price list.
     It is deliberately gated behind a button per line: the field is read-only until you
     explicitly unlock it, so a stray click in a table full of numbers can't quietly reprice a
     quote. The unlock is a toggle — turning it off restores the list price immediately.

     ONE-TIME BY DESIGN. This lives in React state only and is never persisted — no localStorage,
     nothing sent to the price store — so it dies on reload, sign-out, or leaving the tab. A
     negotiated one-off must not silently become the price next week; that is what the Price List
     tab (draft → publish, audited) is for. It IS captured on the printed quote and in the
     quotes-issued log, because what went to the customer is a fact worth keeping. */
  const linePrice = (l) => {
    if (l.customOn) {
      const n = Number(l.customPrice);
      if (l.customPrice !== "" && Number.isFinite(n) && n > 0) return PC.round2(n);
    }
    return priceFor(l.entry.sku);
  };
  /** True when this line is actually quoting a hand-typed number rather than the list price. */
  const isCustom = (l) => {
    if (!l.customOn) return false;
    const n = Number(l.customPrice);
    return l.customPrice !== "" && Number.isFinite(n) && n > 0 && n !== priceFor(l.entry.sku);
  };
  /* Promo is a straight discount off the regular price shown above, so "You save 10%" means
     exactly 10%. (It previously rode the engine's additive customPct, which made a 10% promo on a
     +15% tier come out at 8.7% off — technically defensible, but it printed a number the rep did
     not type. With the pricing method now explicit, the honest reading wins.) */
  const promoPrice = (l) => {
    const override = Number(l.promoPrice);
    if (l.promoPrice !== "" && Number.isFinite(override)) return PC.round2(override);
    const reg = linePrice(l);
    if (reg == null) return null;
    return PC.round2(reg * (1 - Math.abs(Number(promoPct) || 0) / 100));
  };

  /* The whole price list is ON SCREEN from the moment the tab opens — search NARROWS it, it does
     not summon it (Rick, 2026-08-13). A rep builds a rate card by browsing what's for sale, the
     same way Pro Forma's grid works; an empty box that only reveals SKUs once you already know
     what to type is the wrong instrument for "arrange the price list for this conversation." */
  const visible = search.trim()
    ? allSkus.filter((x) => (x.sku.code + " " + x.name + " " + (x.product.category || "") + " " + (x.sku.packing || ""))
        .toLowerCase().includes(search.trim().toLowerCase()))
    : allSkus;

  function addSku(code) {
    if (lines.some((l) => l.code === code)) return;
    // Price Change auto-fill: on ADD, look up the most recent price quoted to this customer for
    // this SKU (any purpose) issued before this notice's effective date. Editable afterwards.
    const prior = purposeId === "price_change"
      ? lastQuotedPrice(quoteLog, customer, code, dates.effectiveDate)
      : null;
    setLines((ls) => [...ls, { code, prevPrice: prior ? String(prior.unitPrice) : "", promoPrice: "", customOn: false, customPrice: "" }]);
    // Search is NOT cleared on add: the rep is usually adding several SKUs off one search
    // ("asiago"), and wiping it would send them back to the top of the full list every time.
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

  const unpriced = selected.filter((l) => linePrice(l) == null).map((l) => l.code);
  // Mixed unit selections would make a single "$ / LB" column header a lie.
  const units = new Set(selected.map((l) => l.entry.sku.unit === "case" ? "case" : "lb"));
  const priceHeader = units.size === 1 ? (units.has("case") ? "$ / CASE" : "$ / LB") : "PRICE";
  const unitSuffix = (entry) => (units.size > 1 ? (entry.sku.unit === "case" ? "/cs" : "/lb") : "");

  const canPrint = selected.length > 0 && !missingDates.length && !unpriced.length && manualValid
    && (purposeId !== "promo" || !!headline.trim());

  /* A worked example off a real SKU on the sheet, so the margin-vs-markup difference is visible
     at the moment of choosing rather than discovered on the printed page. */
  const example = selected[0] || allSkus.find((x) => baseCost(x.sku) != null);
  const exBase = example ? baseCost(example.sku ? example.sku : example.entry.sku) : null;
  const exSku = example ? (example.sku || example.entry.sku) : null;
  const exPrice = exSku ? priceFor(exSku) : null;

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
      unitPrice: purposeId === "promo" ? promoPrice(l) : linePrice(l),
      unit: l.entry.sku.unit === "case" ? "case" : "lb",
      tierId,
      // How the number was arrived at. Without this a logged price can't be explained after the
      // fact — tierId alone is a lie once a manual margin/markup has replaced the tier's preset,
      // and this log is what a future Price Change Notification quotes back to the customer.
      priceMode,
      pricePct: priceMode === "tier" ? (tier.adjustPct ?? 0) : Number(manualPct),
      // A one-off negotiated price is ephemeral in the UI but a FACT once it goes to a customer:
      // record that this line departed from the list, and what the list price was at the time.
      custom: isCustom(l),
      listPrice: regularPrice(l.entry),
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
    /* Brand tokens. Every one of these was sampled out of the reference one-sheet
       (FreshDirect_PricingAOneSheet.pdf) and matched back to a brand-kit token, so the printed
       document reproduces that sheet's exact colour system rather than an approximation of it:
         page background   #FFFBDC  Heritage Cream   (neutrals)
         panels + row band #FAF9F5  Casa Paper       (neutrals)
         headline / bars   #064E22  Forest Green     (primary)
         eyebrow / dates   #009640  Italia Green     (accent)
         body copy         #141413  Mountain Ink     (neutrals)
         PDO badge + bar   #C8E2C5  Alpine Mint      (secondary)  <- was wrongly a green tint
       Kit-first with the client-config fallbacks a tenant without a full kit still has; nothing
       about Monti is hardcoded. */
    const c = kit?.identity?.colors || {};
    const neutral = (name, fallback) => (c.neutrals || []).find((n) => n.name === name)?.hex || fallback;
    const secondary = (name, fallback) => (c.secondary || []).find((s) => s.name === name)?.hex || fallback;
    const primary = c.primary?.hex || brand?.colors?.primary || config.brand?.accent || "#064E22";
    const accent = c.accent?.hex || config.brand?.accent || primary;
    const cream = neutral("Heritage Cream", (c.neutrals || [])[0]?.hex || "#FFFBDC");
    const paper = neutral("Casa Paper", "#FAF9F5");
    const ink = neutral("Mountain Ink", "#141413");
    const muted = neutral("Stone Charcoal", "#716A6A");
    const mint = secondary("Alpine Mint", "#C8E2C5");
    /* Two warm tones the reference uses that are NOT brand-kit tokens: the hairline rules between
       table rows, and the non-PDO ("Mountain") badge. Sampled at #E3DEC7 / #EFE8D1 fill with
       #796A2E text — a khaki + bronze pair that reads as "not a protected designation" without
       competing with the green. Kept literal and labelled rather than faked out of the green
       palette, which is what made my first pass look wrong. */
    const rule = "#E3DEC7";
    const tanFill = "#EFE8D1";
    const tanInk = "#796A2E";
    const legalGrey = "#BBB6A6"; // footer small print — lighter than Stone Charcoal in the sample
    const display = kit?.identity?.type?.display?.cssStack || 'Fraunces, Georgia, serif';
    const ui = kit?.identity?.type?.ui?.cssStack || 'Inter, system-ui, sans-serif';

    const b = config.brand || {};
    const contact = b.contact || {};
    /* Resolved through the MEDIA HUB manifest, never a hand-typed Cloudinary id — see the
       directive in lib/images.js. Transparent-safe, so the oval mark sits on the cream page
       instead of inside a white box. */
    const logoUrl = brandAssetUrl(resolved, kit?.identity?.logo?.primary, "preview");
    const motto = kit?.voice?.motto || "";
    const heritage = kit?.voice?.heritage || "";
    const attribution = kit?.attribution || "";
    const basisLabel = config.pricing?.costBasis || "FOB";
    const paymentTerms = config.pricing?.paymentTerms || "";

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
    // Standing payment terms, on every purpose (Rick, 2026-08-21: "baked in"). Read from
    // config.pricing.paymentTerms, so it is the tenant's number and not a literal in this file;
    // a tenant that hasn't set terms simply prints no line.
    if (paymentTerms) rightLines.push(`<div class="terms">Payment terms: <b>${esc(paymentTerms)}</b></div>`);

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
          + `<td class="r price">${money(linePrice(l))}<span class="u">${esc(unitSuffix(e))}</span></td>`
          + `<td class="r wt">${esc(e.sku.pack?.netLb ?? "—")} lb net/case</td></tr>`;
      }).join("");
    } else if (purposeId === "price_change") {
      note = `Merchandise pricing, ${esc(basisLabel)}`;
      head = `<tr><th>Item</th><th>SKU</th><th class="r">Previous</th><th class="r">New</th><th class="r">Change</th><th class="r">Effective</th></tr>`;
      body = selected.map((l) => {
        const e = l.entry;
        const nw = linePrice(l);
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
        const reg = linePrice(l);
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
      /* Full-bleed letterhead. The @page margin MUST stay 0: that band is where the browser
         prints its own header and footer (document title + the portal URL), and it was also the
         white edge around the cream on the exported PDF. No margin, no band — the browser drops
         both and the cream runs to the paper edge. The page inset lives in body padding instead,
         clear of the ~0.25in most printers physically cannot mark. A background on body
         propagates to the page canvas, so the cream fills every sheet, not just the first.
         (Deliberately no house name in this file's printed output — see the build log.) */
      @page { size: letter portrait; margin: 0; }
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      html{background:${cream}}
      body{margin:0;padding:38px 44px 30px;background:${cream};color:${ink};font-family:${ui};font-size:11px;line-height:1.45}
      .num{font-family:${display};font-style:italic;font-size:1.28em;color:${primary};font-weight:600}

      /* header */
      .hd{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
      .hd img{height:62px;width:auto;object-fit:contain}
      .hd .right{text-align:right}
      .prep{font-size:10.5px;font-weight:700;letter-spacing:.09em;color:${primary};text-transform:uppercase}
      .dim{color:${muted};font-size:10px;margin-top:2px}
      .key{color:${accent};font-size:10.5px;font-weight:700;margin-top:4px}
      /* Payment terms sit under the date line in Mountain Ink, not the accent green — the date is
         the one thing that expires, and two competing green lines would flatten that. */
      .terms{color:${ink};font-size:10px;margin-top:3px}
      .terms b{color:${primary}}
      .eyebrow{margin:16px 0 0;font-size:9.5px;font-weight:700;letter-spacing:.22em;color:${accent};text-transform:uppercase}
      h1{font-family:${display};font-style:italic;font-weight:600;color:${primary};font-size:28px;line-height:1.12;margin:5px 0 0}
      .sub{font-family:${display};font-style:italic;color:${muted};font-size:11.5px;margin:7px 0 0;max-width:78%}

      /* story panels — Casa Paper card on the cream page, hairline warm rule */
      .panels{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:16px}
      .panel{border:1px solid ${rule};background:${paper};border-radius:5px;padding:11px 12px}
      .panel h3{margin:0 0 5px;font-size:11.5px;font-weight:700;color:${primary}}
      .panel p{margin:0;font-size:9.5px;line-height:1.5;color:${ink}}

      /* divider bar — Alpine Mint on Forest Green, exactly as the sample sets it */
      .divider{margin-top:16px;background:${primary};color:${mint};text-align:center;
        padding:8px 10px;border-radius:4px;font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase}

      /* pricing table */
      .tablehd{display:flex;justify-content:space-between;align-items:baseline;margin:15px 0 7px}
      .tablehd h2{margin:0;font-size:10.5px;font-weight:700;letter-spacing:.19em;color:${primary};text-transform:uppercase}
      .tablehd .note{font-family:${display};font-style:italic;color:${muted};font-size:10px}
      table{width:100%;border-collapse:collapse;border:1px solid ${rule};border-radius:5px;overflow:hidden}
      thead th{background:${primary};color:#FFFFFF;text-align:left;padding:8px 9px;font-size:8.5px;
        font-weight:700;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
      tbody td{padding:7px 9px;border-bottom:1px solid ${rule};vertical-align:middle}
      /* Row banding is cream ↔ Casa Paper — the sample alternates the two page neutrals. My first
         pass tinted alternate rows green, which read as a colour wash rather than a paper change. */
      tbody tr:nth-child(even){background:${paper}}
      tbody tr:last-child td{border-bottom:none}
      .r{text-align:right}
      .item{font-weight:700;color:${primary};font-size:11px}
      .spec{color:${ink};font-size:9.5px;font-weight:400}
      .sku{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:${ink};font-size:9.5px;white-space:nowrap}
      .price{font-weight:700;font-size:11.5px;color:${ink};white-space:nowrap}
      .prev{color:${muted};white-space:nowrap}
      .wt{font-weight:600;color:${ink};white-space:nowrap}
      .u{color:${muted};font-weight:400;font-size:8.5px;margin-left:1px}
      .none{color:${muted};font-style:italic;font-size:9px}
      .up{color:#9A3B1B;font-weight:700;white-space:nowrap}
      .down{color:${accent};font-weight:700;white-space:nowrap}
      .flat{color:${muted};white-space:nowrap}
      /* PDO = Alpine Mint pill (a protected designation, so it carries the brand green).
         Everything else = the warm khaki pill, which is how the sample separates the two. */
      .badge{display:inline-block;border-radius:999px;padding:2px 7px;font-size:7.5px;font-weight:700;
        letter-spacing:.09em;background:${tanFill};color:${tanInk};white-space:nowrap}
      .badge.pdo{background:${mint};color:${primary}}

      /* footer */
      .ft{margin-top:14px;display:flex;justify-content:space-between;align-items:flex-end;gap:22px}
      .ft .legal{color:${legalGrey};font-size:8.5px;line-height:1.5;max-width:66%}
      .ft .motto{text-align:right;font-family:${display};font-style:italic;color:${primary};font-size:13px}
      .ft .attr{color:${legalGrey};font-size:8px;font-style:normal;font-family:${ui}}
      .contact{margin-top:9px;border-top:1px solid ${rule};padding-top:7px;font-size:8.5px;color:${ink}}
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
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Pricing method</span>
          <select className={selCls} value={priceMode} onChange={(e) => setPriceMode(e.target.value)}>
            {PRICE_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        {priceMode !== "tier" && (
          <div className="flex flex-col gap-1">
            <span className={fieldLabel}>
              {priceMode === "margin" ? "Margin" : "Markup"} % <span className="text-error">*</span>
            </span>
            <input type="number" min="0" max={priceMode === "margin" ? 99.9 : undefined} step="0.5"
              className={selCls + " w-24" + (manualValid ? "" : " border-error")}
              value={manualPct}
              onChange={(e) => setManualPct(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        )}
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
            <span className="text-[10px] text-fg-muted">off the regular price</span>
          </div>
        )}
      </div>

      {/* What the chosen method actually does to a real SKU on this sheet. Margin and markup are
          different arithmetic and the gap widens as the % rises — show it, don't explain it. */}
      {exSku && exBase != null && (
        <p className="rounded-base border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
          {priceMode === "tier" ? (
            <>Using the preset for <b className="text-fg">{tier.label}</b> ({tier.adjustPct >= 0 ? "+" : ""}{tier.adjustPct}%) on the{" "}
              {config.pricing?.costBasis || "FOB"} cost. <span className="font-mono">#{exSku.code}</span>: cost{" "}
              <span className="font-mono">{money(exBase)}</span> → <span className="font-mono font-semibold text-fg">{exPrice == null ? "—" : money(exPrice)}</span>
              /{exSku.unit === "case" ? "cs" : "lb"}.</>
          ) : !manualValid ? (
            <span className="font-semibold text-error">
              {priceMode === "margin" ? "A gross margin must be between 0 and 99.9% — at 100% the price is infinite." : "Enter a markup percentage."}
            </span>
          ) : (
            <>
              <b className="text-fg">{priceMode === "margin" ? "Gross profit margin" : "Markup on cost"} {manualPct}%</b>
              {" "}replaces the class-of-trade preset ({tier.adjustPct >= 0 ? "+" : ""}{tier.adjustPct}%); {tier.label} still sets the audience line on the sheet.
              {" "}<span className="font-mono">#{exSku.code}</span>: cost <span className="font-mono">{money(exBase)}</span>{" "}
              {priceMode === "margin" ? <>÷ (1 − {manualPct}%)</> : <>× (1 + {manualPct}%)</>} ={" "}
              <span className="font-mono font-semibold text-fg">{exPrice == null ? "—" : money(exPrice)}</span>/{exSku.unit === "case" ? "cs" : "lb"}
              {exPrice != null && exPrice > 0 && (
                <> — a <b className="text-fg">{(((exPrice - exBase) / exPrice) * 100).toFixed(1)}%</b> margin,{" "}
                  <b className="text-fg">{(((exPrice - exBase) / exBase) * 100).toFixed(1)}%</b> markup.</>
              )}
            </>
          )}
        </p>
      )}

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={fieldLabel}>Selections <Badge variant="brand">{selected.length}</Badge></span>
        {purposeId === "price_change" && (
          <Button variant="outline" size="sm" onClick={refillPrevious}>Fill previous prices from history</Button>
        )}
      </div>

      {/* Search sits directly above the product list it filters — same element, same styling and
          same wording as Pro Forma's (Rick, 2026-08-13). One search bar, one behaviour, whichever
          tab the rep is on. */}
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
        <CardContent className="p-0">
          {/* The price list itself — open on arrival, scrollable, priced at the selected tier so the
              rep is reading the same numbers that will print. Click a row to add or remove it. */}
          <div className="max-h-[460px] overflow-y-auto rounded-base">
            {visible.map((x) => {
              const added = lines.some((l) => l.code === x.sku.code);
              // The effective price under the CURRENT pricing method — not the tier price. The
              // list has to show the number that will actually print, or it teaches the rep the
              // wrong figure right at the moment they're choosing what to quote.
              const unit = priceFor(x.sku);
              const ph = isPlaceholderImage(resolved, x.sku.code);
              return (
                <button key={x.sku.code} type="button" onClick={() => (added ? removeSku(x.sku.code) : addSku(x.sku.code))}
                  title={added ? "Remove from this quote" : "Add to this quote"}
                  className={"flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 transition-colors "
                    + (added ? "bg-brand-primary/10" : "hover:bg-bg")}>
                  <span className={"flex h-5 w-5 flex-none items-center justify-center rounded-base border "
                    + (added ? "border-brand-primary bg-brand-primary text-brand-on-primary" : "border-border text-fg-muted")}>
                    {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                  {/* Internal selection surface, same as Pro Forma's grid — low-res reference images
                      are allowed here (dashed border marks them) because nothing from this picker
                      reaches the printed sheet; the quote is type, not photography. */}
                  <img loading="lazy" src={codeImageUrl(resolved, config, x.sku.code, "card", { allowPlaceholder: true })} alt=""
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                    className={"h-10 w-10 flex-none rounded-base border bg-white object-contain "
                      + (ph ? "border-dashed border-fg-muted/60" : "border-border")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{x.name}</span>
                    <span className="block truncate text-xs text-fg-muted">{tidy(x.sku.packing)}</span>
                  </span>
                  <span className="hidden w-32 flex-none truncate text-xs text-fg-muted sm:block">{x.product.category}</span>
                  <span className="w-24 flex-none text-right font-mono text-sm">
                    {unit == null
                      ? <span className="rounded-base border border-warning/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning" title="No cost on file — price on request">POR</span>
                      : <>{money(unit)}<span className="text-xs text-fg-muted">/{x.sku.unit === "case" ? "cs" : "lb"}</span></>}
                  </span>
                  <span className="w-16 flex-none text-right font-mono text-xs text-fg-muted">#{x.sku.code}</span>
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-fg-muted">Nothing matches “{search}”.</p>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-fg-muted">
        Showing {visible.length} of {allSkus.length} SKUs at{" "}
        {priceMode === "tier"
          ? `${tier.label} pricing`
          : `${manualPct}% ${priceMode === "margin" ? "gross margin" : "markup"} on cost`}
        {search.trim() ? " — clear the search to see the whole list." : "."}
      </p>

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
                const reg = linePrice(l);            // honours this line's custom price
                const listed = regularPrice(e);      // the list price it departs from
                const custom = isCustom(l);
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
                          {l.customOn ? (
                            <input type="number" min="0" step="0.01" autoFocus
                              value={l.customPrice}
                              onChange={(ev) => setLineField(l.code, "customPrice", ev.target.value)}
                              placeholder={listed == null ? "price" : String(listed)}
                              title="Custom price for this quote only — not saved to the price list"
                              className="w-28 rounded-base border border-brand-primary bg-bg px-2 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                          ) : reg == null
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
                          {l.customOn ? (
                            <input type="number" min="0" step="0.01" autoFocus
                              value={l.customPrice}
                              onChange={(ev) => setLineField(l.code, "customPrice", ev.target.value)}
                              placeholder={listed == null ? "price" : String(listed)}
                              title="Custom price for this quote only — not saved to the price list"
                              className="w-28 rounded-base border border-brand-primary bg-bg px-2 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                          ) : reg == null
                            ? <span className="text-[10px] font-semibold uppercase text-warning">POR</span>
                            : <>{money(reg)}<span className="text-xs text-fg-muted">{suffix}</span></>}
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
                          {l.customOn ? (
                            <input type="number" min="0" step="0.01" autoFocus
                              value={l.customPrice}
                              onChange={(ev) => setLineField(l.code, "customPrice", ev.target.value)}
                              placeholder={listed == null ? "price" : String(listed)}
                              title="Custom regular price for this quote only — the promo recomputes off it"
                              className="w-28 rounded-base border border-brand-primary bg-bg px-2 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
                          ) : reg == null ? <span className="text-[10px] uppercase text-warning">POR</span> : <s>{money(reg)}</s>}
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
                      <div className="flex items-center justify-end gap-1">
                        {/* Custom price — the gate. The price field above is read-only until this
                            is switched on, so a stray click can't reprice a line. Toggling it off
                            drops the typed number and restores the list price immediately. */}
                        <button
                          type="button"
                          onClick={() => setLines((ls) => ls.map((x) => x.code === l.code
                            ? { ...x, customOn: !x.customOn, customPrice: x.customOn ? "" : x.customPrice }
                            : x))}
                          title={l.customOn
                            ? "Use the list price again (clears the custom price)"
                            : "Set a custom price for this line — this quote only, never saved"}
                          className={"inline-flex items-center gap-1 rounded-base border px-2 py-1 text-[11px] font-medium transition-colors "
                            + (l.customOn
                              ? "border-brand-primary bg-brand-primary text-brand-on-primary"
                              : "border-border text-fg-muted hover:border-brand-primary hover:text-fg")}
                        >
                          {l.customOn ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          Custom
                        </button>
                        <button type="button" onClick={() => removeSku(l.code)} title="Remove from this quote"
                          className="rounded-base p-1 text-fg-muted hover:text-error"><X className="h-4 w-4" /></button>
                      </div>
                      {custom && (
                        <div className="mt-0.5 text-right text-[10px] text-fg-muted">
                          was {listed == null ? "POR" : money(listed)}
                        </div>
                      )}
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
                : !manualValid ? "Fix the pricing percentage to print"
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
