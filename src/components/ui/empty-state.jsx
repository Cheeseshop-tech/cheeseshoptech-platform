import { cn } from "@/lib/utils.js";

// Empty state (Part B4 / Part D). Pass an icon, title, description, and optional action.
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-base border border-dashed border-border bg-surface px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-3 rounded-full bg-bg p-3 text-fg-muted">
          <Icon className="h-6 w-6" />
        </div>
      )}
      {title && <h3 className="font-heading text-lg text-fg">{title}</h3>}
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
