import { useEffect, useMemo, useState } from "react";
import { Search, Save, Upload, RotateCcw, History, Lock, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { uploadFileAuto } from "@/lib/cloudinary.js";
import { flattenSkus } from "@/lib/proposals.js";
import {
  fetchPriceState, savePriceDraft, publishPrices, discardPriceDraft,
  priceFieldFor, baseCostOf,
} from "@/lib/prices.js";

/* ============================================================================
   PRICE LIST — the pricing truth (Rick, 2026-08-21)

   catalog.json's FOB costs arrived from a spreadsheet sync and could only change by
   regenerating and redeploying the bundle. This makes the tool itself the source: edit a base
   cost, save a draft, publish it with an effective date and a valid-until date, and every change
   is recorded against the person who made it.

   WHAT IS EDITED is the FOB BASE COST (Rick's call) — cost.fob for catch-weight bulk, cost.fobCase
   for exact-weight precuts. That is the one number the whole engine derives from: class-of-trade
   tiers, manual margin/markup and promo discounts all recompute off it, so one edit moves every
   quoted price consistently instead of three tier prices drifting apart.

   TWO STAGES, deliberately. Save writes a private draft that nobody can quote. Publish is a
   separate act that stamps the effective window, bumps the version, and makes it live everywhere
   at once (via the overlay in use-pricing-data.js). Prices feed buyer-facing quote sheets that
   print without a second look — a stray keystroke must not be able to reach a customer.

   WRITES ARE ADMIN-ONLY, enforced server-side in netlify/functions/prices.js. This component hides
   the controls for a base rep, but hiding a button is not security — the function is the gate.
   ========================================================================== */

const money = (n) => (n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtDate = (iso) => (iso ? new Date(String(iso).slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

const selCls = "rounded-base border border-border bg-bg px-2.5 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
const fieldLabel = "text-[10px] font-semibold uppercase tracking-wide text-fg-muted";

export function PriceList({ data, resolved, itemsDoc, priceList }) {
  const { catalog, config } = data;
  const { toast } = useToast();
  const { user } = useAuth();

  // Role gate for the UI only — the server is the real gate (see the header note).
  const roles = (user?.app_metadata?.roles || user?.roles || []);
  const canEdit = Array.isArray(roles)
    ? roles.some((r) => r === "admin" || r === "client-admin")
    : true; // unknown shape (e.g. the dev-bypass user) — let the server decide

  const skus = useMemo(() => flattenSkus(catalog, itemsDoc), [catalog, itemsDoc]);

  const [published, setPublished] = useState(priceList || null);
  const [draft, setDraft] = useState(null);
  // CRM-05 follow-up (2026-09-03): fetchPriceState() now flags a genuine read failure via
  // `unavailable` instead of returning the same {published:null} shape as "nothing published
  // yet". buildPriceMap() below sends a COMPLETE price map on every save, falling back to
  // draftOf()/publishedOf() for every SKU not actively being typed — so saving on top of a
  // failed load would silently WIPE every other SKU's real published/draft price override, and
  // publishing would push that wiped draft live. unavailable blocks Save Draft until a real read
  // succeeds, and the status line says so instead of falsely claiming no list has been published.
  const [unavailable, setUnavailable] = useState(false);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [search, setSearch] = useState("");
  // Local unsaved edits, keyed by SKU code -> the typed string (kept as a string so a
  // half-typed "8." doesn't get coerced to 8 mid-keystroke).
  const [edits, setEdits] = useState({});
  const [effectiveDate, setEffectiveDate] = useState("");
  const [sourceDoc, setSourceDoc] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");

  async function refresh() {
    const st = await fetchPriceState(resolved?.id);
    setPublished(st.published);
    setDraft(st.draft);
    setLog(st.log);
    setUnavailable(!!st.unavailable);
    setSourceDoc(st.draft?.sourceDoc || st.published?.sourceDoc || null);
    setLoading(false);
    return st;
  }
  useEffect(() => { let alive = true; fetchPriceState(resolved?.id).then((st) => {
    if (!alive) return;
    setPublished(st.published); setDraft(st.draft); setLog(st.log);
    setUnavailable(!!st.unavailable);
    setSourceDoc(st.draft?.sourceDoc || st.published?.sourceDoc || null);
    setLoading(false);
  }); return () => { alive = false; }; }, [resolved?.id]);

  /* The value in play for a SKU, in precedence order: your unsaved typing → the saved draft →
     the published list → the bundled catalog. Each row shows which of those it is. */
  const draftOverlay = draft ? { prices: draft.prices } : null;
  const publishedOverlay = published ? { prices: published.prices } : null;

  const bundledOf = (sku) => baseCostOf(sku, null);
  const publishedOf = (sku) => publishedOverlay?.prices?.[sku.code]?.[priceFieldFor(sku)] ?? null;
  const draftOf = (sku) => draftOverlay?.prices?.[sku.code]?.[priceFieldFor(sku)] ?? null;
  const effectiveOf = (sku) => draftOf(sku) ?? publishedOf(sku) ?? bundledOf(sku);
  const typedOf = (sku) => (edits[sku.code] !== undefined ? edits[sku.code] : null);

  const shown = search.trim()
    ? skus.filter((x) => (x.sku.code + " " + x.name + " " + (x.product.category || "")).toLowerCase().includes(search.trim().toLowerCase()))
    : skus;

  const dirtyCodes = Object.keys(edits).filter((code) => {
    const entry = skus.find((x) => x.sku.code === code);
    if (!entry) return false;
    const typed = edits[code];
    if (typed === "" || typed === null || typed === undefined) return false;
    const n = Number(typed);
    if (!Number.isFinite(n)) return false;
    return n !== effectiveOf(entry.sku);
  });
  const invalidCodes = Object.keys(edits).filter((code) => {
    const typed = edits[code];
    if (typed === "" || typed === undefined || typed === null) return false;
    const n = Number(typed);
    return !Number.isFinite(n) || n <= 0;
  });

  /* Build the full price map to save: every SKU that has an override anywhere (published, draft,
     or newly typed). The store holds a COMPLETE picture of overrides, not a delta — so a value
     that was already published stays put when you only edit one other line. */
  function buildPriceMap() {
    const out = {};
    for (const { sku } of skus) {
      const field = priceFieldFor(sku);
      const typed = typedOf(sku);
      let value = null;
      if (typed !== null && typed !== "" && Number.isFinite(Number(typed))) value = Number(typed);
      else value = draftOf(sku) ?? publishedOf(sku);
      if (value !== null && value !== undefined) out[sku.code] = { [field]: value };
    }
    return out;
  }

  const MAX_DOC_BYTES = 20 * 1024 * 1024;
  async function attachFile(file) {
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      toast({ title: "File too large", description: `${(file.size / 1048576).toFixed(1)} MB — 20 MB max.`, tone: "warning" });
      return;
    }
    setUploading(true);
    try {
      const up = await uploadFileAuto({ file, tenantFolder: resolved.cloudinaryFolder, subfolder: "price-lists" });
      // Held in local state only until you Save — attaching a file is not itself a price change.
      setSourceDoc({ name: file.name, url: up.secureUrl, publicId: up.publicId, format: up.format, bytes: up.bytes });
      toast({ title: "Document attached", description: "Save the draft to record it against this price list.", tone: "success" });
    } catch (e) {
      toast({ title: "Upload failed", description: String(e.message || e), tone: "warning" });
    } finally { setUploading(false); }
  }
  function onDropFile(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) attachFile(f);
  }

  async function onSaveDraft() {
    if (unavailable) {
      toast({ title: "Can't save right now", description: "The current price list couldn't be loaded, so saving would risk wiping every other SKU's price. Refresh and try again.", tone: "warning" });
      return;
    }
    const docChanged = (sourceDoc?.publicId || "") !== (draft?.sourceDoc?.publicId || "");
    if (!dirtyCodes.length && !docChanged) { toast({ title: "Nothing changed", description: "Edit a price or attach a document first.", tone: "warning" }); return; }
    if (invalidCodes.length) { toast({ title: "Fix the invalid price(s)", description: invalidCodes.join(", "), tone: "warning" }); return; }
    setBusy("save");
    try {
      const res = await savePriceDraft(resolved?.id, buildPriceMap(), note, sourceDoc);
      setEdits({});
      await refresh();
      toast({ title: "Draft saved", description: `${res.changed} change(s) recorded. Not live until you publish.`, tone: "success" });
    } catch (e) {
      toast({ title: "Save failed", description: String(e.message || e), tone: "warning" });
    } finally { setBusy(""); }
  }

  async function onPublish() {
    if (!draft) { toast({ title: "Nothing to publish", description: "Save a draft first.", tone: "warning" }); return; }
    if (!effectiveDate) { toast({ title: "Set an effective date", description: "A published price list carries the date it takes effect.", tone: "warning" }); return; }
    if (validUntil && validUntil < effectiveDate) { toast({ title: "Check the dates", description: "Valid-until cannot be before the effective date.", tone: "warning" }); return; }
    setBusy("publish");
    try {
      const res = await publishPrices(resolved?.id, { effectiveDate, validUntil, note });
      await refresh();
      setNote("");
      toast({ title: `Price list v${res.published.version} published`, description: `Effective ${fmtDate(effectiveDate)} — live on every quote now.`, tone: "success" });
    } catch (e) {
      toast({ title: "Publish failed", description: String(e.message || e), tone: "warning" });
    } finally { setBusy(""); }
  }

  async function onDiscard() {
    setBusy("discard");
    try {
      await discardPriceDraft(resolved?.id);
      setEdits({});
      await refresh();
      toast({ title: "Draft discarded", description: "The published list is untouched.", tone: "success" });
    } catch (e) {
      toast({ title: "Discard failed", description: String(e.message || e), tone: "warning" });
    } finally { setBusy(""); }
  }

  const overrideCount = Object.keys(published?.prices || {}).length;

  return (
    <div className="space-y-4">
      {/* Status of the list of record */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Published version" value={published ? `v${published.version}` : "—"} />
        <Stat label="Effective" value={published ? fmtDate(published.effectiveDate) : "—"} />
        <Stat label="Valid until" value={published?.validUntil ? fmtDate(published.validUntil) : "—"} />
        <Stat label="Priced SKUs" value={overrideCount || "—"} />
      </div>

      <p className={`rounded-base border px-3 py-2 text-xs ${unavailable ? "border-warning/50 bg-warning/5 text-warning" : "border-border bg-surface text-fg-muted"}`}>
        {loading ? "Loading the price list of record…" : unavailable ? (
          <>Couldn't load the price list of record just now — this does NOT mean nothing is published.
            {" "}Refresh before editing; saving on top of this would risk wiping every other SKU's price.</>
        ) : published ? (
          <>
            Quoting <b className="text-fg">price list v{published.version}</b>, effective{" "}
            <b className="text-fg">{fmtDate(published.effectiveDate)}</b>
            {published.validUntil ? <> through <b className="text-fg">{fmtDate(published.validUntil)}</b></> : null}
            {" "}· published by {published.publishedBy} on {fmtWhen(published.publishedAt)}.
            {" "}Every surface — Pro Forma, Quote Builder, proposals — quotes these numbers.
          </>
        ) : (
          <>No published price list yet — every surface is quoting the <b className="text-fg">bundled catalog</b> costs
            from the spreadsheet sync. Edit and publish here to take ownership of the numbers.</>
        )}
      </p>

      {draft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-base border border-warning/50 bg-warning/5 px-3 py-2.5">
          <p className="text-xs text-fg">
            <Badge variant="warning">Unpublished draft</Badge>{" "}
            {Object.keys(draft.prices || {}).length} SKU(s) · saved by {draft.updatedBy} on {fmtWhen(draft.updatedAt)}.
            {" "}<b>Not live</b> — nothing quotes these until you publish.
          </p>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onDiscard} disabled={!!busy}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Discard draft
            </Button>
          )}
        </div>
      )}

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-base border border-border bg-bg px-3 py-2 text-xs text-fg-muted">
          <Lock className="h-3.5 w-3.5" /> You can see the price list of record but not change it — publishing prices is an admin action.
        </p>
      )}

      {/* Publish panel */}
      {canEdit && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="flex flex-col gap-1">
              <span className={fieldLabel}>Effective date <span className="text-error">*</span></span>
              <input type="date" className={selCls + (effectiveDate ? "" : " border-warning")}
                value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <span className={fieldLabel}>Valid until</span>
              <input type="date" className={selCls} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="flex min-w-[220px] flex-1 flex-col gap-1">
              <span className={fieldLabel}>Note (recorded with the change)</span>
              <input className={selCls} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. 2026-09 list — milk and freight increase" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onSaveDraft}
                disabled={!!busy || uploading || (!dirtyCodes.length && (sourceDoc?.publicId || "") === (draft?.sourceDoc?.publicId || ""))}>
                <Save className="mr-1.5 h-4 w-4" />
                {busy === "save" ? "Saving…" : `Save draft${dirtyCodes.length ? ` (${dirtyCodes.length})` : ""}`}
              </Button>
              <Button variant="primary" onClick={onPublish} disabled={!!busy || !draft || !effectiveDate}>
                <Upload className="mr-1.5 h-4 w-4" />
                {busy === "publish" ? "Publishing…" : "Publish"}
              </Button>
            </div>
            <p className="w-full text-xs text-fg-muted">
              Save records your edits privately. <b className="text-fg">Publish</b> makes them the
              quoted price everywhere, stamped with the effective window and your name.
              {dirtyCodes.length > 0 && <span className="ml-1 font-semibold text-warning">{dirtyCodes.length} unsaved edit(s).</span>}
            </p>

            {/* Source document — drag the HQ price sheet in and it travels with the published
                version as provenance. Deliberately NOT parsed: the numbers stay yours to type, so
                a misread cell can never move a price on its own. */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDropFile}
              className={"mt-1 w-full rounded-base border-2 border-dashed p-4 text-center transition-colors "
                + (dragging ? "border-brand-primary bg-brand-primary/5" : "border-border")}
            >
              {sourceDoc ? (
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  <Paperclip className="h-4 w-4 text-brand-primary" />
                  <a href={sourceDoc.url} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-brand-primary hover:underline">{sourceDoc.name}</a>
                  <span className="text-fg-muted">
                    {sourceDoc.bytes ? `· ${(sourceDoc.bytes / 1024).toFixed(0)} KB ` : ""}
                    · attached{sourceDoc.uploadedBy ? ` by ${sourceDoc.uploadedBy}` : ""}
                    {sourceDoc.uploadedAt ? ` on ${fmtWhen(sourceDoc.uploadedAt)}` : ""}
                  </span>
                  <button type="button" onClick={() => setSourceDoc(null)}
                    className="rounded-base border border-border px-2 py-0.5 text-fg-muted hover:text-error">Remove</button>
                </div>
              ) : (
                <label className="block cursor-pointer text-xs text-fg-muted">
                  <Upload className="mx-auto mb-1 h-4 w-4 text-fg-muted" />
                  {uploading ? "Uploading…" : (
                    <>
                      <b className="text-fg">Drag the price document here</b> — or click to choose.
                      <span className="mt-0.5 block">
                        The HQ sheet these numbers came from (xlsx, PDF, csv). Attached as the source
                        of record and published with the list; it is never read or parsed.
                      </span>
                    </>
                  )}
                  <input type="file" className="hidden" disabled={uploading}
                    accept=".xlsx,.xls,.csv,.pdf,.numbers,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f); e.target.value = ""; }} />
                </label>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <input
          className="h-10 w-full rounded-base border border-border bg-bg pl-9 pr-3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the price list — SKU code or product name…"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Bundled</TableHead>
              <TableHead className="text-right">Published</TableHead>
              <TableHead className="text-right">New base cost</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map(({ sku, name, product }) => {
              const field = priceFieldFor(sku);
              const unit = field === "fobCase" ? "/cs" : "/lb";
              const bundled = bundledOf(sku);
              const pub = publishedOf(sku);
              const eff = effectiveOf(sku);
              const typed = typedOf(sku);
              const value = typed !== null ? typed : (eff == null ? "" : String(eff));
              const n = Number(value);
              const bad = value !== "" && (!Number.isFinite(n) || n <= 0);
              const changed = value !== "" && Number.isFinite(n) && n !== eff;
              const delta = changed && eff != null ? n - eff : null;
              const source = draftOf(sku) != null ? "draft" : pub != null ? "published" : bundled != null ? "bundled" : "none";
              return (
                <TableRow key={sku.code}>
                  <TableCell>
                    <div className="font-medium text-fg">{name}</div>
                    <div className="text-xs text-fg-muted">{product.category} · {sku.packing}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-fg-muted">#{sku.code}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-fg-muted">{money(bundled)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{pub == null ? <span className="text-fg-muted">—</span> : money(pub)}</TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        value={value}
                        onChange={(e) => setEdits((m) => ({ ...m, [sku.code]: e.target.value }))}
                        className={"w-28 rounded-base border bg-bg px-2 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand "
                          + (bad ? "border-error" : changed ? "border-warning" : "border-border")}
                      />
                    ) : (
                      <span className="font-mono text-sm">{money(eff)}</span>
                    )}
                    <span className="ml-1 text-[10px] text-fg-muted">{unit}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {bad ? <span className="font-semibold text-error">invalid</span>
                      : delta == null ? <span className="text-fg-muted">—</span>
                      : <span className={delta > 0 ? "text-warning" : "text-brand-primary"}>
                          {delta > 0 ? "+" : "−"}{money(Math.abs(delta))}
                          {eff ? ` · ${delta > 0 ? "+" : "−"}${Math.abs((delta / eff) * 100).toFixed(1)}%` : ""}
                        </span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={source === "draft" ? "warning" : source === "published" ? "success" : "muted"}>
                      {source}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {shown.length === 0 && <TableRow><TableCell colSpan={7}><span className="text-fg-muted">Nothing matches “{search}”.</span></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-fg-muted">
        Showing {shown.length} of {skus.length} SKUs. “Bundled” is the spreadsheet-sync cost in
        catalog.json; “Published” is what this tool has made the truth. Editing the{" "}
        <b className="text-fg">base cost</b> moves every class-of-trade, margin/markup and promo
        price derived from it.
      </p>
      {/* The boundary between this tab and Quotes, said out loud — the two are easy to confuse and
          the consequences differ completely (Rick, 2026-08-21). */}
      <p className="rounded-base border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
        This is the <b className="text-fg">official price list</b> — published, dated and permanent.
        For a <b className="text-fg">one-off negotiated price on a single quote</b>, don't change it
        here: use the Custom button on that line in the <b className="text-fg">Quotes</b> tab, which
        applies to that quote only and never touches this list.
      </p>

      {/* Audit record */}
      <Card>
        <CardContent className="p-4">
          <button type="button" onClick={() => setShowLog((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline">
            <History className="h-4 w-4" />
            {showLog ? "Hide" : "Show"} change record ({log.length})
          </button>
          {showLog && (
            <div className="mt-3 max-h-96 overflow-y-auto rounded-base border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>What</TableHead>
                    <TableHead>SKU</TableHead><TableHead className="text-right">From</TableHead><TableHead className="text-right">To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-fg-muted">{fmtWhen(r.at)}</TableCell>
                      <TableCell className="text-xs">{r.by}</TableCell>
                      <TableCell className="text-xs">
                        {r.action === "publish"
                          ? <><Badge variant="success">published v{r.version}</Badge>{" "}
                              <span className="text-fg-muted">eff {fmtDate(r.effectiveDate)}{r.validUntil ? `–${fmtDate(r.validUntil)}` : ""} · {r.count} SKU(s)</span></>
                          : r.action === "discard-draft"
                            ? <Badge variant="muted">draft discarded</Badge>
                            : <Badge variant="warning">draft edit</Badge>}
                        {r.note ? <div className="mt-0.5 italic text-fg-muted">{r.note}</div> : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-fg-muted">{r.skuCode ? `#${r.skuCode}` : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-fg-muted">
                        {r.action === "draft" ? (r.from == null ? <span className="italic">bundled</span> : money(r.from)) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.action === "draft" ? money(r.to) : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {log.length === 0 && <TableRow><TableCell colSpan={6}><span className="text-fg-muted">No changes recorded yet.</span></TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-2 text-xs text-fg-muted">
            Every edit and every publish is recorded against the signed-in account, server-side —
            the name is taken from the verified session, not from the browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
