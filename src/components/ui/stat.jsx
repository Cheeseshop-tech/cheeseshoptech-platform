import { Card, CardContent } from "@/components/ui/card.jsx";
import { cn } from "@/lib/utils.js";

// Ledger stat tile (DESIGN_SYSTEM B4): a big italic-serif figure over an uppercase tracked
// label. The signature data-display element — use for dashboard / report metric rows.
// Right slot takes a `badge` node or, failing that, a lucide `icon`. `onClick` makes the tile
// a clickable deep-link (hover-border affordance); `tone="error"` reddens the figure.
export function Stat({ label, value, badge, icon: Icon, tone, onClick, className }) {
  return (
    <Card
      onClick={onClick}
      className={cn(onClick && "cursor-pointer transition-colors hover:border-brand-primary", className)}
    >
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <div className={cn("cs-display text-3xl", tone === "error" ? "text-error" : "text-fg")}>{value}</div>
          <div className="cs-eyebrow mt-2 text-fg-muted">{label}</div>
        </div>
        {badge ?? (Icon ? <Icon className="h-5 w-5 text-fg-muted" /> : null)}
      </CardContent>
    </Card>
  );
}
