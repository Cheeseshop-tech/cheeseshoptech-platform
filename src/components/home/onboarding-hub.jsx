import { ArrowUpRight, Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { toolIcon } from "@/lib/icons.js";
import tplConfig from "@config/clients/_template.json";

// Onboarding Hub — house-side (ADMIN_DASHBOARDS_SPEC §3 / PLATFORM_SIDES_SPEC §2).
// cheeseshoptech.com is the hub for new-client onboarding: the template app set (THE CLONE,
// config/clients/_template.json) surfaced as launchable cards — each opens the content-free
// demo tenant (?client=demo) so a prospect or a new client sees exactly what they get, empty —
// plus the intake kit downloads (public/onboarding-kit/, copied from onboarding-kit/).
// Runbook: docs/CLIENT_ONBOARDING_GUIDE.md · Spec: docs/ONBOARDING_AND_AGENTS_SDD.md.

const KIT_FILES = [
  { file: "00_README_Client_Team.md", label: "README — who fills what", owner: "Whole client team" },
  { file: "01_Product_Catalog_and_Pricing.xlsx", label: "Product Catalog & Pricing", owner: "Inventory / ops manager" },
  { file: "02_Inventory_Availability.xlsx", label: "Inventory Availability (weekly)", owner: "Inventory / warehouse" },
  { file: "03_Standing_Orders_Commitments.xlsx", label: "Standing Orders & Commitments", owner: "Sales / accounts" },
  { file: "04_Brand_Asset_Checklist.md", label: "Brand Asset Checklist", owner: "Design team" },
  { file: "05_Marketing_Content_Worksheet.docx", label: "Marketing Content Worksheet", owner: "Marketing dept" },
  { file: "06_Sales_History.xlsx", label: "Sales History (forecasting)", owner: "ERP / accounting" },
];

function openDemo(route) {
  const url = route ? `/?client=demo&page=${encodeURIComponent(route)}` : "/?client=demo";
  window.open(url, "_blank", "noopener,noreferrer");
}

export function OnboardingHub() {
  const tools = tplConfig.tools || [];

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="cs-eyebrow text-fg-muted">New-client onboarding</span>
          <h2 className="cs-display mt-1 text-2xl text-brand-primary">Template apps — the clone every client starts from</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            The full app set, content-free. Each card opens the live template portal — what a new
            client sees on day one, before their data arrives. Stand-up procedure:
            docs/CLIENT_ONBOARDING_GUIDE.md (~15 min, config only).
          </p>
        </div>
        <button
          type="button"
          onClick={() => openDemo(null)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-primary px-4 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-brand-on-primary"
        >
          Open the template portal <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Template app cards — mirrors the client home-hub tool cards, sourced from _template.json. */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = toolIcon(tool.icon);
          const soon = tool.status === "coming-soon";
          return (
            <Card
              key={tool.key}
              onClick={() => (soon ? null : openDemo(tool.route))}
              className={
                "group flex gap-4 p-5 transition-all " +
                (soon ? "cursor-default opacity-70" : "cursor-pointer hover:-translate-y-0.5 hover:border-brand-primary")
              }
            >
              <div
                className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-brand-primary"
                style={{ background: "color-mix(in srgb, var(--cs-color-brand-primary) 12%, transparent)" }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="cs-display text-lg text-brand-primary">{tool.label}</h3>
                  {!soon && <ArrowUpRight className="h-3.5 w-3.5 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" />}
                </div>
                {tool.description && <p className="mt-1 text-sm text-fg-muted">{tool.description}</p>}
                <span className="cs-eyebrow mt-2 inline-block text-brand-primary">
                  {soon ? "Configured at onboarding" : "Template · opens empty"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Intake kit — the client-facing templates, downloadable straight from the hub. */}
      <h3 className="cs-display mb-3 mt-10 text-xl text-brand-primary">Client intake kit</h3>
      <p className="mb-4 max-w-2xl text-sm text-fg-muted">
        One file per client department, in the format their data pipes straight into the platform.
        Send the whole set; the README assigns owners. Contact on the kit: hello@cheeseshoptech.com.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KIT_FILES.map((k) => (
          <a
            key={k.file}
            href={`/onboarding-kit/${k.file}`}
            download
            className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand-primary"
          >
            <Download className="h-4 w-4 flex-none text-brand-primary" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-fg">{k.label}</span>
              <span className="cs-eyebrow text-fg-muted">{k.owner}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
