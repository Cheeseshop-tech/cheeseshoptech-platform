import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        brand: "bg-brand-primary text-brand-on-primary",
        accent: "bg-brand-accent text-brand-on-accent",
        outline: "border border-border text-fg",
        muted: "bg-bg text-fg-muted",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
        error: "bg-error text-white",
        info: "bg-info text-white",
      },
    },
    defaultVariants: { variant: "muted" },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
