import { ArrowRight, ExternalLink, FileText, MonitorPlay, Layers, Palette, Quote, Images } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf } from "@/lib/auth.js";

// THE CONTENT ENGINE — the assembly line, one page (Rick, 2026-07-02 reorg: "Tools" → Content
// Engine). Platform-shared app registry (NOT per-tenant config — these are the engine's own
// rooms, identical for every tenant; per-client launch tiles live on the Dashboard instead).
// Mental model, left to right: Brand Systems feeds kits/voice → Media Hub holds ingredients →
// Content Studio composes → Content Library holds the finished pieces.
// (BSE is INTEGRATED as of 2026-07-02 — internal route "brand-systems", behind the gate.)
const APPS = [
  {
    key: "content-studio",
    label: "Content Studio",
    icon: FileText,
    type: "internal",
    route: "proposals",
    roles: ["admin", "client-admin"],
    description: "Compose on-brand content from templates — slide decks, proposals, social and email next. Pulls ingredients from the Media Hub, paints from the Brand Kit.",
    tag: "Make it",
  },
  {
    key: "content-library",
    label: "Content Library",
    icon: MonitorPlay,
    type: "internal",
    route: "presentations",
    roles: ["admin", "client"],
    description: "Finished pieces, cataloged — decks, PDFs, share links. Present from an iPad, share by link, download to device.",
    tag: "Hold it",
  },
  {
    key: "brand-systems",
    label: "Brand Systems",
    icon: Layers,
    type: "internal",
    route: "brand-systems",
    roles: ["admin", "client-admin"],
    description: "The source-of-truth engine — Brand Guide · Brand Voice · Brand Design. Portable brand-kit JSON out; every renderer downstream paints from it.",
    tag: "Source of truth",
  },
  {
    key: "brand-kits",
    label: "Brand Kits",
    icon: Palette,
    type: "internal",
    route: "brand",
    roles: ["admin"],
    description: "Per-client kit worksheets — identity, palette, type, story blocks, imagery. The house-managed contract the whole engine reads.",
    tag: "House · admin",
  },
  {
    key: "brand-voice",
    label: "Brand Voice",
    icon: Quote,
    type: "internal",
    route: "brand-systems",
    roles: ["admin", "client-admin"],
    description: "Voice rules, ready phrases, story angles — the language the Studio writes with. Lives as the Voice discipline inside Brand Systems.",
    tag: "Opens Brand Systems",
  },
  {
    key: "media-hub",
    label: "Media Hub",
    icon: Images,
    type: "internal",
    route: "media",
    roles: ["admin", "client", "pr", "influencer", "creator"],
    description: "Ingredients in — upload, tag and organize product & brand media on Cloudinary. Every image slot in the Studio picks from here.",
    tag: "Ingredients",
  },
];

export function ContentEnginePage({ resolved, onNavigate }) {
  const { user } = useAuth();
  const userRoles = rolesOf(user);
  const apps = APPS.filter((a) => a.roles.some((r) => userRoles.includes(r)));

  function openApp(app) {
    if (app.type === "internal" && app.route) return onNavigate?.(app.route);
    if (app.type === "external" && app.url) window.open(app.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <h1 className="cs-display mb-1 text-3xl text-brand-primary">Content Engine</h1>
      <p className="mb-6 max-w-2xl text-fg-muted">
        {resolved.brand.name}'s assembly line — Brand Systems sets the truth, the Media Hub holds the
        ingredients, Content Studio composes, the Content Library holds the finished work.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map((app) => {
          const Icon = app.icon;
          const external = app.type === "external";
          return (
            <Card
              key={app.key}
              onClick={() => openApp(app)}
              className="group flex cursor-pointer gap-5 p-6 transition-all hover:-translate-y-0.5 hover:border-brand-primary"
            >
              <div
                className="flex h-12 w-12 flex-none items-center justify-center rounded-lg text-brand-primary"
                style={{ background: "color-mix(in srgb, var(--cs-color-brand-primary) 12%, transparent)" }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="cs-display text-xl text-brand-primary">{app.label}</h3>
                  {external
                    ? <ExternalLink className="h-3.5 w-3.5 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    : <ArrowRight className="h-3.5 w-3.5 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />}
                </div>
                <p className="mt-1 text-sm text-fg-muted">{app.description}</p>
                <span className="cs-eyebrow mt-3 inline-block text-brand-primary">{app.tag}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="cs-eyebrow mt-8 text-fg-muted">
        Brand Systems → Media Hub → Content Studio → Content Library
      </p>
    </div>
  );
}
