import { Card, CardContent } from "@/components/ui/card.jsx";
import { cn } from "@/lib/utils.js";

// Token-driven figure colors for the `accent` prop (keeps the hub's multi-color stat row on
// this one shared component instead of a divergent copy).
export const STAT_ACCENT = {
  brand: "var(--cs-color-brand-primary)",
  accent: "var(--cs-color-brand-accent)",
  info: "var(--cs-color-info)",
  warning: "var(--cs-color-warning)",
  success: "var(--cs-color-success)",
  error: "var(--cs-color-error)",
  fg: "var(--cs-color-fg)",
};

// Ledger stat tile (DESIGN_SYSTEM B4): a big italic-serif figure over an uppercase tracked
// label. The signature data-display element — use for dashboard / report metric rows.
// Right slot takes a `badge` node or, failing that, a lucide `icon`. `onClick` makes the tile
// a clickable deep-link (hover-border affordance); `tone="error"` reddens the figure; `accent`
// colors the figure from the token palette (STAT_ACCENT).
export function Stat({ label, value, badge, icon: Icon, tone, accent, onClick, className }) {
  const figureColor = tone === "error" ? STAT_ACCENT.error : (accent ? STAT_ACCENT[accent] : undefined);
  return (
    <Card
      onClick={onClick}
      className={cn(onClick && "cursor-pointer transition-colors hover:border-brand-primary", className)}
    >
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <div
            className={cn("cs-display text-3xl", !figureColor && "text-fg")}
            style={figureColor ? { color: figureColor } : undefined}
          >
            {value}
          </div>
          <div className="cs-eyebrow mt-2 text-fg-muted">{label}</div>
        </div>
        {badge ?? (Icon ? <Icon className="h-5 w-5 text-fg-muted" /> : null)}
      </CardContent>
    </Card>
  );
}
