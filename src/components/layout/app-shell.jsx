import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils.js";

// Portal layout shell: fixed sidebar nav + topbar + content. Pure composition; tenant
// branding flows in through tokens, so this same shell serves every client.
// Workspace customization (Rick, 2026-07-02): the left nav collapses to an icon rail via the
// lever in the topbar — more room for work surfaces (Studio, Pricing). Persisted per browser.
export function AppShell({ brand, isHouse = false, nav = [], activeKey, onNavigate, topbarRight, breadcrumb, children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("cs-nav-collapsed") === "1"; } catch { return false; }
  });
  const toggleNav = () => setCollapsed((c) => {
    const n = !c;
    try { localStorage.setItem("cs-nav-collapsed", n ? "1" : "0"); } catch { /* private mode */ }
    return n;
  });

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar brand={brand} isHouse={isHouse} nav={nav} activeKey={activeKey} onNavigate={onNavigate} collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleNav}
              title={collapsed ? "Expand navigation" : "Collapse navigation"}
              className="hidden h-8 w-8 flex-none items-center justify-center rounded-base text-fg-muted transition-colors hover:bg-bg hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:inline-flex"
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <div className="min-w-0">{breadcrumb}</div>
          </div>
          <div className="flex items-center gap-3">{topbarRight}</div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ brand, isHouse, nav, activeKey, onNavigate, collapsed }) {
  return (
    <aside className={cn("hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex", collapsed ? "w-16" : "w-60")}>
      <div className={cn("flex h-16 flex-col justify-center gap-0.5 border-b border-border", collapsed ? "items-center px-2" : "px-5")}>
        {brand?.logo ? (
          <img src={brand.logo} alt={brand?.name || "Logo"} className={cn("w-auto", collapsed ? "h-6" : "h-7")} />
        ) : (
          <span className="font-heading italic text-lg leading-none text-brand-primary" title={brand?.name}>
            {collapsed ? (brand?.name || "?").slice(0, 1) : brand?.name}
          </span>
        )}
        {/* Type/layout signal (no color change): the agency house reads distinct from a client
            tenant — driven by the tenant resolver's isHouse flag, not per-client code. */}
        {isHouse && !collapsed && <span className="cs-eyebrow text-fg-muted">Agency Console</span>}
      </div>
      <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-3")}>
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate?.(item.key)}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex w-full items-center rounded-base text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active
                  ? "bg-brand-primary text-brand-on-primary"
                  : "text-fg-muted hover:bg-bg hover:text-fg"
              )}
            >
              {Icon && <Icon className="h-4 w-4 flex-none" />}
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="cs-eyebrow border-t border-border p-4 text-fg-muted">
          Powered by CheeseShop TECH
        </div>
      )}
    </aside>
  );
}
