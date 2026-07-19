import { useEffect, useMemo, useRef, useState } from "react";
import { Palette, Type as TypeIcon, MessageSquareQuote, Images, FileText, Pencil, Eye, Download, Upload, Plus, X, ImagePlus, Quote } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { listClients } from "@/lib/clientConfig.js";
import { getBrandKit, AUDIENCES } from "@/lib/brandKit.js";
import { workingKit, saveKitEdits, clearKitEdits, setPath, exportKit, parseKitFile, loadKitEdits } from "@/lib/brand-kit-edits.js";
import { cldUrl, uploadAsset, UPLOAD_PRESET } from "@/lib/cloudinary.js";

// Brand Management (house admin) — CheeseShop TECH's single-source brand kit per client, with an
// edit-mode WORKSHEET (text, colors, lists, story blocks, image upload). Edits persist per-tenant
// in localStorage and overlay the committed brand-kit.json; Export commits the JSON back to source.
// BRAND_KIT_AND_PROPOSAL_SPEC.md.
export function BrandManagement({ initialTenant }) {
  const clients = listClients();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState(initialTenant || clients[0]?.id);
  const [editing, setEditing] = useState(false);
  const bundled = useMemo(() => getBrandKit({ id: tenantId }), [tenantId]);
  const [kit, setKit] = useState(() => workingKit(tenantId, bundled));
  const importRef = useRef(null);
  const hasEdits = !!loadKitEdits(tenantId);

  useEffect(() => { setKit(workingKit(tenantId, getBrandKit({ id: tenantId }))); }, [tenantId]);

  const audLabel = (id) => AUDIENCES.find((a) => a.id === id)?.label || id;
  function update(path, value) { setKit((k) => saveKitEdits(tenantId, setPath(k, path, value))); }

  function onImport(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try { const k = parseKitFile(ev.target.result); setKit(saveKitEdits(tenantId, k)); toast({ title: "Brand kit imported", tone: "success" }); }
      catch { toast({ title: "Couldn't import", description: "Not a valid brand-kit file.", tone: "error" }); }
    };
    r.readAsText(f);
  }
  function resetToSource() { clearKitEdits(tenantId); setKit(workingKit(tenantId, getBrandKit({ id: tenantId }))); toast({ title: "Reverted to committed kit", tone: "info" }); }

  if (!kit) {
    return (
      <div>
        <Header clients={clients} tenantId={tenantId} setTenantId={setTenantId} editing={false} />
        <EmptyState icon={FileText} title="No brand kit yet" description="Clone _brand-kit-template.json and fill the worksheet — voice, identity, imagery, story blocks." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-fg">Brand management</h1>
          <p className="mt-1 max-w-2xl text-fg-muted">
            The single source of each client's brand — identity, imagery, voice, and story blocks.
            CheeseShop TECH maintains this so clients focus on product and sales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editing && (
            <>
              <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />
              <Button size="sm" variant="ghost" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" /> Import</Button>
              <Button size="sm" variant="outline" onClick={() => exportKit(tenantId, kit)}><Download className="h-4 w-4" /> Export</Button>
              {hasEdits && <Button size="sm" variant="ghost" onClick={resetToSource}>Revert</Button>}
            </>
          )}
          <Button size="sm" variant={editing ? "primary" : "outline"} onClick={() => setEditing((v) => !v)}>
            {editing ? <><Eye className="h-4 w-4" /> Done</> : <><Pencil className="h-4 w-4" /> Edit</>}
          </Button>
          <label className="ml-2 flex items-center gap-2 text-sm text-fg-muted">
            <span>Client</span>
            <select className="h-9 rounded-base border border-border bg-bg px-2 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" value={tenantId} onChange={(e) => { setTenantId(e.target.value); setEditing(false); }}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.brand?.name || c.id}</option>)}
            </select>
          </label>
        </div>
      </div>

      {hasEdits && !editing && (
        <p className="mb-4 rounded-base border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg">
          Unsaved local edits to this kit. Open Edit → Export to commit them to the source of truth.
        </p>
      )}

      <div className="space-y-6">
        {/* Voice */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <PanelIcon icon={MessageSquareQuote} />
            <div><CardTitle>Voice & messaging</CardTitle><CardDescription>How {kit.brandName} sounds.</CardDescription></div>
          </CardHeader>
          <CardContent className="space-y-5">
            <EditText editing={editing} area value={kit.voice?.positioningHook} onChange={(v) => update("voice.positioningHook", v)}
              display={<p className="font-heading text-xl leading-relaxed text-fg">{kit.voice?.positioningHook}</p>} label="Positioning hook" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field editing={editing} label="Motto" value={kit.voice?.motto} onChange={(v) => update("voice.motto", v)} />
              <Field editing={editing} label="Mantra" value={kit.voice?.mantra} onChange={(v) => update("voice.mantra", v)} />
              <Field editing={editing} label="Heritage" value={kit.voice?.heritage} onChange={(v) => update("voice.heritage", v)} />
            </div>
            <Field editing={editing} area label="Mission" value={kit.voice?.mission} onChange={(v) => update("voice.mission", v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ListEditor editing={editing} label="Core values" items={kit.voice?.coreValues} tone="brand" onChange={(v) => update("voice.coreValues", v)} />
              <ListEditor editing={editing} label="Voice attributes" items={kit.voice?.attributes} tone="accent" onChange={(v) => update("voice.attributes", v)} />
            </div>
            <ListEditor editing={editing} label="Avoid" items={kit.voice?.avoid} tone="muted" onChange={(v) => update("voice.avoid", v)} />
            <ListEditor editing={editing} label="Approved phrasing" items={kit.voice?.readyPhrases} tone="line" onChange={(v) => update("voice.readyPhrases", v)} />
          </CardContent>
        </Card>

        {/* Identity */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <PanelIcon icon={Palette} />
            <div><CardTitle>Visual identity</CardTitle><CardDescription>Logo, color system + type.</CardDescription></div>
          </CardHeader>
          <CardContent className="space-y-6">
            <LogoRow editing={editing} kit={kit} tenantId={tenantId} onSet={(path, id) => update(path, id)} toast={toast} />
            <ColorBlock editing={editing} colors={kit.identity?.colors} onChange={(path, v) => update(path, v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              {["display", "ui"].map((k) => {
                const t = kit.identity?.type?.[k]; if (!t) return null;
                return (
                  <div key={k} className="rounded-base border border-border bg-bg p-4">
                    <div className="flex items-center gap-2"><TypeIcon className="h-4 w-4 text-brand-primary" />
                      <EditText editing={editing} value={t.family} onChange={(v) => update(`identity.type.${k}.family`, v)} display={<span className="font-heading text-lg text-fg">{t.family}</span>} />
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-fg-muted">{t.role}</p>
                    <EditText editing={editing} area value={t.usage} onChange={(v) => update(`identity.type.${k}.usage`, v)} display={t.usage ? <p className="mt-2 text-sm text-fg">{t.usage}</p> : null} label="Usage" />
                    {t.doNotUseFor && !editing && <p className="mt-1 text-xs text-fg-muted">Avoid: {t.doNotUseFor}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Story blocks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PanelIcon icon={Images} />
              <div><CardTitle>Story blocks</CardTitle><CardDescription>Modular narratives the Proposal Builder pulls from — tagged by audience.</CardDescription></div>
            </div>
            {editing && (
              <Button size="sm" variant="outline" onClick={() => update("storyBlocks", [...(kit.storyBlocks || []), { key: `block-${Date.now()}`, title: "New story block", audience: [], body: "" }])}>
                <Plus className="h-4 w-4" /> Add block
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {(kit.storyBlocks || []).map((b, i) => (
              <div key={b.key} className="rounded-base border border-border bg-bg p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <EditText editing={editing} value={b.title} onChange={(v) => update(`storyBlocks.${i}.title`, v)} display={<h3 className="font-heading text-lg text-fg">{b.title}</h3>} />
                  {editing && <button onClick={() => update("storyBlocks", kit.storyBlocks.filter((_, j) => j !== i))} className="text-fg-muted hover:text-error" aria-label="Remove block"><X className="h-4 w-4" /></button>}
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {editing
                    ? AUDIENCES.map((a) => {
                        const on = (b.audience || []).includes(a.id);
                        return <button key={a.id} onClick={() => update(`storyBlocks.${i}.audience`, on ? b.audience.filter((x) => x !== a.id) : [...(b.audience || []), a.id])}
                          className={"rounded-full border px-2 py-0.5 text-[11px] " + (on ? "border-brand-primary bg-brand-primary text-brand-on-primary" : "border-border text-fg-muted")}>{a.label}</button>;
                      })
                    : (b.audience || []).map((a) => <Badge key={a} variant="muted" className="text-[10px]">{audLabel(a)}</Badge>)}
                </div>
                <EditText editing={editing} area value={b.body} onChange={(v) => update(`storyBlocks.${i}.body`, v)} display={<p className="text-sm leading-relaxed text-fg-muted">{b.body}</p>} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tasting notes — optional, first-person "affineur's note" voice.
            docs/HANDOFF_2026-07-19_luxury-dtc-design-research.md + AGENT_A1_BUILD_SPEC.md Part F. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PanelIcon icon={Quote} />
              <div><CardTitle>Tasting notes</CardTitle><CardDescription>Optional first-person expert notes, SKU-linked when possible — powers the Affineur's Note slide template.</CardDescription></div>
            </div>
            {editing && (
              <Button size="sm" variant="outline" onClick={() => update("tastingNotes", [...(kit.tastingNotes || []), { key: `note-${Date.now()}`, sku: "", body: "", attribution: "" }])}>
                <Plus className="h-4 w-4" /> Add note
              </Button>
            )}
          </CardHeader>
          {(editing || (kit.tastingNotes || []).length > 0) && (
            <CardContent className="grid gap-4 md:grid-cols-2">
              {(kit.tastingNotes || []).map((n, i) => (
                <div key={n.key} className="rounded-base border border-border bg-bg p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <EditText editing={editing} value={n.sku} onChange={(v) => update(`tastingNotes.${i}.sku`, v)}
                      display={n.sku ? <p className="cs-eyebrow text-fg-muted">SKU {n.sku}</p> : null} label="SKU (optional)" />
                    {editing && <button onClick={() => update("tastingNotes", kit.tastingNotes.filter((_, j) => j !== i))} className="text-fg-muted hover:text-error" aria-label="Remove note"><X className="h-4 w-4" /></button>}
                  </div>
                  <EditText editing={editing} area value={n.body} onChange={(v) => update(`tastingNotes.${i}.body`, v)}
                    display={<p className="text-sm italic leading-relaxed text-fg-muted">{n.body}</p>} label="Note (first person)" />
                  <EditText editing={editing} value={n.attribution} onChange={(v) => update(`tastingNotes.${i}.attribution`, v)}
                    display={n.attribution ? <p className="mt-2 text-xs text-fg-muted">{n.attribution}</p> : null} label="Attribution" />
                </div>
              ))}
              {editing && !(kit.tastingNotes || []).length && <p className="text-sm text-fg-muted">No tasting notes yet — add one to enable the Affineur's Note slide.</p>}
            </CardContent>
          )}
        </Card>

        <p className="text-xs text-fg-muted">Managed by CheeseShop TECH · last updated {kit.updatedAt}. Edits save to this browser; Export the kit to commit it to the source of truth.</p>
      </div>
    </div>
  );
}

/* ---------- small editors ---------- */

function Header({ clients, tenantId, setTenantId }) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-3xl text-fg">Brand management</h1>
      <label className="mt-2 flex items-center gap-2 text-sm text-fg-muted">Client
        <select className="h-9 rounded-base border border-border bg-bg px-2 text-fg" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.brand?.name || c.id}</option>)}
        </select>
      </label>
    </div>
  );
}

function PanelIcon({ icon: Icon }) {
  return <div className="flex h-10 w-10 flex-none items-center justify-center rounded-base text-brand-primary" style={{ background: "color-mix(in srgb, var(--cs-color-brand-primary) 12%, transparent)" }}><Icon className="h-5 w-5" /></div>;
}

function EditText({ editing, value, onChange, display, area, label }) {
  if (!editing) return display ?? (value ? <span>{value}</span> : null);
  return area
    ? <Textarea value={value || ""} rows={3} placeholder={label} onChange={(e) => onChange(e.target.value)} />
    : <Input value={value || ""} placeholder={label} onChange={(e) => onChange(e.target.value)} />;
}

function Field({ editing, label, value, onChange, area }) {
  if (!editing && !value) return null;
  return (
    <div>
      <p className="cs-eyebrow text-fg-muted">{label}</p>
      {editing
        ? (area ? <Textarea className="mt-1" value={value || ""} rows={3} onChange={(e) => onChange(e.target.value)} /> : <Input className="mt-1" value={value || ""} onChange={(e) => onChange(e.target.value)} />)
        : <p className="mt-0.5 text-fg">{value}</p>}
    </div>
  );
}

function ListEditor({ editing, label, items = [], tone = "muted", onChange }) {
  const [draft, setDraft] = useState("");
  if (!editing && !items?.length) return null;
  const add = () => { if (draft.trim()) { onChange([...(items || []), draft.trim()]); setDraft(""); } };
  if (!editing) {
    return (
      <div>
        <p className="cs-eyebrow mb-1.5 text-fg-muted">{label}</p>
        {tone === "line"
          ? <ul className="space-y-1.5">{items.map((it, i) => <li key={i} className="border-l-2 border-brand-primary pl-3 font-heading text-fg">{it}</li>)}</ul>
          : <div className="flex flex-wrap gap-1.5">{items.map((it, i) => <Badge key={i} variant={tone === "line" ? "muted" : tone}>{it}</Badge>)}</div>}
      </div>
    );
  }
  return (
    <div>
      <p className="cs-eyebrow mb-1.5 text-fg-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {(items || []).map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-sm text-fg">
            {it}<button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-fg-muted hover:text-error" aria-label="Remove"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input value={draft} placeholder={`Add to ${label.toLowerCase()}…`} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function ColorBlock({ editing, colors, onChange }) {
  if (!colors) return null;
  const swatches = [];
  if (colors.primary) swatches.push(["identity.colors.primary", colors.primary]);
  if (colors.accent) swatches.push(["identity.colors.accent", colors.accent]);
  (colors.secondary || []).forEach((c, i) => swatches.push([`identity.colors.secondary.${i}`, c]));
  (colors.neutrals || []).forEach((c, i) => swatches.push([`identity.colors.neutrals.${i}`, c]));
  if (colors.sparingAccent) swatches.push(["identity.colors.sparingAccent", colors.sparingAccent]);
  return (
    <div>
      <p className="cs-eyebrow mb-2 text-fg-muted">Colors</p>
      <div className="flex flex-wrap gap-3">
        {swatches.map(([path, c]) => (
          <div key={path} className="w-36">
            {editing
              ? <input type="color" value={c.hex} onChange={(e) => onChange(`${path}.hex`, e.target.value)} className="h-14 w-full cursor-pointer rounded-base border border-border bg-transparent" />
              : <div className="h-14 w-full rounded-base border border-border" style={{ background: c.hex }} />}
            <p className="mt-1.5 text-sm font-medium text-fg">{c.name}</p>
            <p className="font-mono text-xs text-fg-muted">{c.hex}</p>
            {c.role && <p className="mt-0.5 text-[11px] leading-tight text-fg-muted">{c.role}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogoRow({ editing, kit, tenantId, onSet, toast }) {
  const slots = [["identity.logo.primary", "Logo", kit.identity?.logo?.primary], ["imagery.hero", "Hero image", kit.imagery?.hero], ["identity.logo.seal", "Seal", kit.identity?.logo?.seal]];
  return (
    <div>
      <p className="cs-eyebrow mb-2 text-fg-muted">Logo & brand imagery</p>
      <div className="flex flex-wrap gap-4">
        {slots.map(([path, label, id]) => <ImageSlot key={path} path={path} label={label} publicId={id} editing={editing} tenantId={tenantId} onSet={onSet} toast={toast} />)}
      </div>
    </div>
  );
}

function ImageSlot({ path, label, publicId, editing, tenantId, onSet, toast }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  async function onFile(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (!UPLOAD_PRESET) { toast({ title: "Upload not configured", description: "Set VITE_CLOUDINARY_UPLOAD_PRESET to enable uploads.", tone: "warning" }); return; }
    setBusy(true);
    try { const a = await uploadAsset({ file: f, tenantFolder: `${tenantId}/brand`, subfolder: "brand" }); onSet(path, a.publicId); toast({ title: `${label} uploaded`, tone: "success" }); }
    catch (err) { toast({ title: "Upload failed", description: String(err?.message || err), tone: "error" }); }
    finally { setBusy(false); }
  }
  return (
    <div className="w-32">
      <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-base border border-border bg-white">
        {publicId ? <img src={cldUrl(publicId, "card")} alt={label} className="h-full w-full object-contain" /> : <ImagePlus className="h-6 w-6 text-fg-muted" />}
      </div>
      <p className="mt-1 text-xs text-fg-muted">{label}</p>
      {editing && (
        <>
          <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,.png,.jpg,.jpeg,.webp,.svg,.gif" className="hidden" onChange={onFile} />
          <Button size="sm" variant="ghost" className="mt-1 w-full" onClick={() => ref.current?.click()} disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
        </>
      )}
    </div>
  );
}
