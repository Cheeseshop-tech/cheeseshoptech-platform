import { cn } from "@/lib/utils.js";

// Portal layout shell: fixed sidebar nav + topbar + content. Pure composition; tenant
// branding flows in through tokens, so this same shell serves every client.
export function AppShell({ brand, nav = [], activeKey, onNavigate, topbarRight, breadcrumb, children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar brand={brand} nav={nav} activeKey={activeKey} onNavigate={onNavigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
          <div className="min-w-0">{breadcrumb}</div>
          <div className="flex items-center gap-3">{topbarRight}</div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ brand, nav, activeKey, onNavigate }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        {brand?.logo ? (
          <img src={brand.logo} alt={brand?.name || "Logo"} className="h-7 w-auto" />
        ) : (
          <span className="font-heading text-lg text-brand-primary">{brand?.name}</span>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate?.(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-base px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active
                  ? "bg-brand-primary text-brand-on-primary"
                  : "text-fg-muted hover:bg-bg hover:text-fg"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 text-xs text-fg-muted">
        Powered by CheeseShop TECH
      </div>
    </aside>
  );
}
