import { cn } from "@/lib/utils.js";

// Loading placeholder. Animation auto-disables under prefers-reduced-motion (index.css).
export function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-base bg-border/60", className)} {...props} />;
}
