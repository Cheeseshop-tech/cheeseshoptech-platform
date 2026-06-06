import { cn } from "@/lib/utils.js";

// Data table primitives. Compose: Table > TableHeader/TableBody > TableRow > TableHead/TableCell.
export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-base border border-border">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("bg-bg", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("transition-colors hover:bg-bg/60", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-4 py-3 text-fg", className)} {...props} />;
}
