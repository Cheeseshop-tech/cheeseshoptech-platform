import { ShoppingBag, Images, Calculator, ExternalLink, Wrench, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";

// Map config icon names (kebab) -> lucide components. Extend as new tools appear.
const ICONS = {
  "shopping-bag": ShoppingBag,
  images: Images,
  calculator: Calculator,
};

// A client's existing tools, surfaced as launch tiles (config-driven, per DESIGN_SYSTEM scaling rule).
// external -> open in a new tab; internal -> navigate within the portal; coming-soon -> disabled.
export function ToolsPage({ resolved, onNavigate }) {
  const tools = resolved.tools || [];

  function openTool(tool) {
    if (tool.status === "coming-soon") return;
    if (tool.type === "internal" && tool.route) {
      onNavigate?.(tool.route);
    } else if (tool.type === "external" && tool.url) {
      window.open(tool.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-heading text-3xl text-fg">Tools</h1>
      <p className="mb-6 text-fg-muted">{resolved.brand.name}'s connected tools, all in one place.</p>

      {tools.length === 0 ? (
        <EmptyState icon={Wrench} title="No tools connected yet" description="Connected tools will appear here as launch tiles." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = ICONS[tool.icon] || Wrench;
            const soon = tool.status === "coming-soon";
            const internal = tool.type === "internal";
            return (
              <Card
                key={tool.key}
                onClick={() => openTool(tool)}
                className={
                  "group p-5 transition-colors " +
                  (soon ? "cursor-default opacity-70" : "cursor-pointer hover:border-brand-primary")
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-base bg-bg text-brand-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  {soon ? (
                    <Badge variant="muted">Coming soon</Badge>
                  ) : internal ? (
                    <ArrowRight className="h-4 w-4 text-fg-muted group-hover:text-brand-primary" />
                  ) : (
                    <ExternalLink className="h-4 w-4 text-fg-muted group-hover:text-brand-primary" />
                  )}
                </div>
                <h3 className="mt-4 font-heading text-lg text-fg">{tool.label}</h3>
                {tool.description && <p className="mt-1 text-sm text-fg-muted">{tool.description}</p>}
                <p className="mt-3 text-xs text-fg-muted">
                  {soon ? "Not yet connected" : internal ? "Opens in portal" : "Opens in a new tab"}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
