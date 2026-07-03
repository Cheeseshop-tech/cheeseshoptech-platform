import { useMemo } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Stat } from "@/components/ui/stat.jsx";
import { toolIcon } from "@/lib/icons.js";
import { getHubStats } from "@/lib/hub-stats.js";
import { usePricingData } from "@/lib/use-pricing-data.js";
import { hasCrm } from "@/lib/crm.js";
import { CommandCenter } from "@/components/home/command-center.jsx";
import { PriorityCard } from "@/components/home/priority-card.jsx";
import { AgencyConsole } from "@/components/home/agency-console.jsx";
import { OnboardingHub } from "@/components/home/onboarding-hub.jsx";
import { RoleGate } from "@/components/auth/require-auth.jsx";

// The landing "hub" — the standard client intro page (ported from the Monti Operations Portal,
// now shared + token-themed so every tenant gets it in their brand and the house gets a
// CheeseShop TECH-branded version). Masthead → overlapping stat rollup → tool launch cards.
// Differentiation is content (resolved.home) + tokens only; no per-client code.
export function HomeHub({ resolved, onNavigate }) {
  const home = resolved.home || {};
  const brand = resolved.brand;
  const { data: liveData } = usePricingData(resolved);
  const stats = useMemo(() => getHubStats(resolved, liveData), [resolved, liveData]);
  const tools = resolved.tools || [];

  function openTool(tool) {
    if (tool.status === "coming-soon") return;
    if (tool.featured) return onNavigate?.(`tool:${tool.key}`);
    if (tool.type === "internal" && tool.route) return onNavigate?.(tool.route);
    if (tool.type === "external" && tool.url) window.open(tool.url, "_blank", "noopener,noreferrer");
  }

  const onPrimary = "var(--cs-color-on-primary)";
  const cols = stats.length >= 5 ? "lg:grid-cols-5" : stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <div>
      {/* Masthead — brand-primary gradient (darkens toward the corner so any tenant color works)
          with a faint cross-hatch, a logo chip, an italic motto eyebrow, and the display title. */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          background:
            "linear-gradient(160deg, var(--cs-color-brand-primary), color-mix(in srgb, var(--cs-color-brand-primary) 55%, #000))",
          color: onPrimary,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(135deg, transparent 46%, rgba(255,255,255,.5) 47%, transparent 48%), linear-gradient(45deg, transparent 46%, rgba(255,255,255,.5) 47%, transparent 48%)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative px-7 pb-14 pt-7">
          <div className="flex items-center gap-4">
            {brand.logo ? (
              <span className="inline-flex rounded-xl bg-white px-3 py-2">
                <img src={brand.logo} alt={brand.name} className="block h-9 w-auto" />
              </span>
            ) : (
              <span className="cs-display text-2xl" style={{ color: onPrimary }}>{brand.name}</span>
            )}
            {home.eyebrow && (
              <span
                className="cs-display ml-auto text-sm"
                style={{ color: "color-mix(in srgb, var(--cs-color-on-primary) 78%, transparent)" }}
              >
                {home.eyebrow}
              </span>
            )}
          </div>
          <h1 className="cs-display mt-6 text-4xl md:text-5xl" style={{ color: onPrimary }}>
            {home.title || "Portal"}
          </h1>
          {home.tagline && (
            <p
              className="mt-3 max-w-2xl text-[15px]"
              style={{ color: "color-mix(in srgb, var(--cs-color-on-primary) 82%, transparent)" }}
            >
              {home.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Stat rollup — pulled up to overlap the masthead edge (the signature move). */}
      {stats.length > 0 && (
        <div className={`relative z-10 -mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 ${cols}`}>
          {stats.map((s, i) => (
            <Stat key={s.label + i} value={s.value} label={s.label} accent={s.accent} className="shadow-sm" />
          ))}
        </div>
      )}

      {/* Priority window — what must be handled before anything else today (urgent emails,
          deadline tasks). The dashboard's job is to start the day fast (Rick, 2026-07-02). */}
      <PriorityCard resolved={resolved} />

      {/* Tool launch cards — the operating lead: Pricing & Inventory · CRM · Trade Portal ·
          Campaigns first (config order). Content-making apps live under the Content Engine tab. */}
      {tools.length > 0 && (
        <>
          <h2 className="cs-display mb-4 mt-10 text-2xl text-brand-primary">Operations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tools.map((tool) => {
              const Icon = toolIcon(tool.icon);
              const soon = tool.status === "coming-soon";
              const tag = tool.tag || (soon ? "Coming soon" : tool.type === "external" ? "Opens in a new tab" : "Open in portal");
              return (
                <Card
                  key={tool.key}
                  onClick={() => openTool(tool)}
                  className={
                    "group flex gap-5 p-6 transition-all " +
                    (soon ? "cursor-default opacity-70" : "cursor-pointer hover:-translate-y-0.5 hover:border-brand-primary")
                  }
                >
                  <div
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-lg text-brand-primary"
                    style={{ background: "color-mix(in srgb, var(--cs-color-brand-primary) 12%, transparent)" }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="cs-display text-xl text-brand-primary">{tool.label}</h3>
                      {!soon && (tool.type === "external"
                        ? <ExternalLink className="h-3.5 w-3.5 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />
                        : <ArrowRight className="h-3.5 w-3.5 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />)}
                    </div>
                    {tool.description && <p className="mt-1 text-sm text-fg-muted">{tool.description}</p>}
                    <span className="cs-eyebrow mt-3 inline-block text-brand-primary">{tag}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Command-center "at a glance" — pipeline, campaigns, activity, overdue (CRM tenants only;
          the agency house has no CRM, so its hub stays clean). */}
      {hasCrm(resolved) && <CommandCenter resolved={resolved} onNavigate={onNavigate} />}

      {/* Onboarding Hub + Agency console — house view, CST admins only (ADMIN_DASHBOARDS_SPEC §3).
          cheeseshoptech.com = the hub for new-client onboarding: template app cards (open the
          content-free demo tenant) + the intake-kit downloads, then tenant management ·
          integration health · data pipelines. */}
      {resolved.isHouse && (
        <>
          {/* Onboarding hub is visible to anyone past the house gate (admin OR client-admin
              sessions — Rick sometimes lands as client-admin); the console stays admin-only. */}
          <RoleGate roles={["admin", "client-admin"]}>
            <OnboardingHub />
          </RoleGate>
          <RoleGate roles={["admin"]}>
            <AgencyConsole onNavigate={onNavigate} />
          </RoleGate>
        </>
      )}

      {home.footer && (
        <div className="mt-12 flex flex-wrap justify-between gap-2 border-t border-border pt-5">
          <span className="cs-eyebrow text-fg-muted">{home.footerNote || (resolved.isHouse ? brand.name : `${brand.name} · CheeseShop TECH`)}</span>
          <span className="cs-display text-sm text-fg-muted">{home.footer}</span>
        </div>
      )}
    </div>
  );
}
