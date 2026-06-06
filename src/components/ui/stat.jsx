import { Card, CardContent } from "@/components/ui/card.jsx";
import { cn } from "@/lib/utils.js";

// Ledger stat tile (DESIGN_SYSTEM B4): a big italic-serif figure over an uppercase tracked
// label. The signature data-display element — use for dashboard / report metric rows.
export function Stat({ label, value, badge, className }) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <div className="cs-display text-3xl text-fg">{value}</div>
          <div className="cs-eyebrow mt-2 text-fg-muted">{label}</div>
        </div>
        {badge}
      </CardContent>
    </Card>
  );
}
