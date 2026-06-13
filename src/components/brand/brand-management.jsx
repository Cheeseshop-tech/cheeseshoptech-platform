import { useMemo, useState } from "react";
import { Palette, Type as TypeIcon, MessageSquareQuote, Images, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { listClients } from "@/lib/clientConfig.js";
import { getBrandKit, AUDIENCES } from "@/lib/brandKit.js";

// Brand Management (house admin) — CheeseShop TECH's single-source view of a client's brand kit:
// identity, imagery, voice, and story blocks. This is the orchestration CST is paid for, and the
// "UI version of brand voice" for Monti. One kit feeds portal theming, the Theme Engine, and the
// Proposal Builder (BRAND_KIT_AND_PROPOSAL_SPEC.md). v1 = read + structured worksheet view;
// inline editing + uploads are the next increment behind the same data seam.
export function BrandManagement({ initialTenant }) {
  const clients = listClients();
  const [tenantId, setTenantId] = useState(initialTenant || clients[0]?.id);
  const resolvedLike = { id: tenantId };
  const kit = useMemo(() => getBrandKit(resolvedLike), [tenantId]);
  const audLabel = (id) => AUDIENCES.find((a) => a.id === id)?.label || id;

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
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <span>Client</span>
          <select
            className="h-10 rounded-base border border-border bg-bg px-3 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            {clients.map((c) => <option key={c.id} value={c.id}>{c.brand?.name || c.id}</option>)}
          </select>
        </label>
      </div>

      {!kit ? (
        <EmptyState
          icon={FileText}
          title="No brand kit yet"
          description="This client hasn't been onboarded. Clone _brand-kit-template.json and fill the worksheet — voice, identity, imagery, story blocks."
        />
      ) : (
        <div className="space-y-6">
          {/* Voice — the heart of the kit */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <PanelIcon icon={MessageSquareQuote} />
              <div><CardTitle>Voice & messaging</CardTitle><CardDescription>How {kit.brandName} sounds.</CardDescription></div>
            </CardHeader>
            <CardContent className="space-y-5">
              {kit.voice?.positioningHook && (
                <p className="font-heading text-xl leading-relaxed text-fg">{kit.voice.positioningHook}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Motto" value={kit.voice?.motto} />
                <Field label="Mantra" value={kit.voice?.mantra} />
                <Field label="Heritage" value={kit.voice?.heritage} />
              </div>
              {kit.voice?.mission && <Field label="Mission" value={kit.voice.mission} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <ChipList label="Core values" items={kit.voice?.coreValues} tone="brand" />
                <ChipList label="Voice attributes" items={kit.voice?.attributes} tone="accent" />
              </div>
              <ChipList label="Avoid" items={kit.voice?.avoid} tone="muted" />
              {kit.voice?.readyPhrases?.length > 0 && (
                <div>
                  <p className="cs-eyebrow mb-2 text-fg-muted">Approved phrasing</p>
                  <ul className="space-y-1.5">
                    {kit.voice.readyPhrases.map((p, i) => (
                      <li key={i} className="border-l-2 border-brand-primary pl-3 font-heading text-fg">{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Identity — color + type */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <PanelIcon icon={Palette} />
              <div><CardTitle>Visual identity</CardTitle><CardDescription>Color system + type.</CardDescription></div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="cs-eyebrow mb-2 text-fg-muted">Colors</p>
                <div className="flex flex-wrap gap-3">
                  {colorList(kit.identity?.colors).map((c) => (
                    <div key={c.hex + c.name} className="w-36">
                      <div className="h-14 w-full rounded-base border border-border" style={{ background: c.hex }} />
                      <p className="mt-1.5 text-sm font-medium text-fg">{c.name}</p>
                      <p className="font-mono text-xs text-fg-muted">{c.hex}</p>
                      {c.role && <p className="mt-0.5 text-[11px] leading-tight text-fg-muted">{c.role}</p>}
                    </div>
                  ))}
                </div>
                {kit.identity?.colors?.useRatios && (
                  <div className="mt-4 flex h-3 w-full max-w-xl overflow-hidden rounded-full border border-border">
                    {ratioBar(kit.identity.colors).map((s, i) => (
                      <div key={i} title={`${s.name} ${s.pct}`} style={{ width: s.pct, background: s.hex }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {["display", "ui"].map((k) => {
                  const t = kit.identity?.type?.[k];
                  if (!t) return null;
                  return (
                    <div key={k} className="rounded-base border border-border bg-bg p-4">
                      <div className="flex items-center gap-2"><TypeIcon className="h-4 w-4 text-brand-primary" /><span className="font-heading text-lg text-fg">{t.family}</span></div>
                      <p className="mt-1 text-xs uppercase tracking-wide text-fg-muted">{t.role}</p>
                      {t.usage && <p className="mt-2 text-sm text-fg">{t.usage}</p>}
                      {t.doNotUseFor && <p className="mt-1 text-xs text-fg-muted">Avoid: {t.doNotUseFor}</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Story blocks */}
          {kit.storyBlocks?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <PanelIcon icon={Images} />
                <div><CardTitle>Story blocks</CardTitle><CardDescription>Modular narratives the Proposal Builder pulls from — tagged by audience.</CardDescription></div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {kit.storyBlocks.map((b) => (
                  <div key={b.key} className="rounded-base border border-border bg-bg p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-lg text-fg">{b.title}</h3>
                      {(b.audience || []).map((a) => <Badge key={a} variant="muted" className="text-[10px]">{audLabel(a)}</Badge>)}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{b.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-fg-muted">
            Managed by CheeseShop TECH · last updated {kit.updatedAt}. Inline editing, color picking, and
            drag-and-drop image upload are the next increment (the worksheet for onboarding new clients).
          </p>
        </div>
      )}
    </div>
  );
}

function PanelIcon({ icon: Icon }) {
  return (
    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-base text-brand-primary" style={{ background: "color-mix(in srgb, var(--cs-color-brand-primary) 12%, transparent)" }}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="cs-eyebrow text-fg-muted">{label}</p>
      <p className="mt-0.5 text-fg">{value}</p>
    </div>
  );
}

function ChipList({ label, items, tone = "muted" }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="cs-eyebrow mb-1.5 text-fg-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => <Badge key={i} variant={tone}>{it}</Badge>)}
      </div>
    </div>
  );
}

function colorList(colors) {
  if (!colors) return [];
  const out = [];
  if (colors.primary) out.push(colors.primary);
  if (colors.accent) out.push(colors.accent);
  (colors.secondary || []).forEach((c) => out.push(c));
  (colors.neutrals || []).forEach((c) => out.push(c));
  if (colors.sparingAccent) out.push(colors.sparingAccent);
  return out.filter((c) => c && c.hex);
}

function ratioBar(colors) {
  const all = colorList(colors);
  const ratios = colors.useRatios || {};
  return Object.entries(ratios).map(([name, pct]) => {
    const hit = all.find((c) => c.name === name);
    return { name, pct, hex: hit?.hex || "#ccc" };
  });
}
