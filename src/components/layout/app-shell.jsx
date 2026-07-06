import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";
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

  // Mobile nav drawer (Rick, 2026-07-06 — the real fix; replaces the same-day stopgap
  // back-to-Dashboard button). Below md the sidebar doesn't render at all, so phones get a
  // hamburger → full-height drawer with the SAME role-filtered `nav` the sidebar uses.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMobileNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);
  const mobileNavigate = (key) => { setMobileNavOpen(false); onNavigate?.(key); };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar brand={brand} isHouse={isHouse} nav={nav} activeKey={activeKey} onNavigate={onNavigate} collapsed={collapsed} />
      {mobileNavOpen && (
        <MobileNavDrawer
          brand={brand}
          isHouse={isHouse}
          nav={nav}
          activeKey={activeKey}
          onNavigate={mobileNavigate}
          onClose={() => setMobileNavOpen(false)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              title="Open navigation"
              aria-label="Open navigation"
              className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-base text-fg-muted transition-colors hover:bg-bg hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
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
          {/* Build stamp (baked by Vite define) — glance-check that you're on the latest deploy. */}
          <span className="mt-1 block text-[10px] normal-case tracking-normal opacity-70" title="Build time (UTC)">
            build {typeof __BUILD_STAMP__ !== "undefined" ? __BUILD_STAMP__ : "dev"}
          </span>
        </div>
      )}
    </aside>
  );
}

// Phone navigation (md:hidden): backdrop + left panel over the content. Same role-filtered
// `nav` array as the sidebar, so what a rep can see here is exactly what they'd see on desktop.
// Touch targets are taller (py-3) than the sidebar's — thumbs, not cursors.
function MobileNavDrawer({ brand, isHouse, nav, activeKey, onNavigate, onClose }) {
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            {brand?.logo ? (
              <img src={brand.logo} alt={brand?.name || "Logo"} className="h-7 w-auto" />
            ) : (
              <span className="font-heading italic text-lg leading-none text-brand-primary">{brand?.name}</span>
            )}
            {isHouse && <span className="cs-eyebrow text-fg-muted">Agency Console</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close navigation"
            aria-label="Close navigation"
            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-base text-fg-muted transition-colors hover:bg-bg hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate?.(item.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-base px-3 py-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  active
                    ? "bg-brand-primary text-brand-on-primary"
                    : "text-fg-muted hover:bg-bg hover:text-fg"
                )}
              >
                {Icon && <Icon className="h-4 w-4 flex-none" />}
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="cs-eyebrow border-t border-border p-4 text-fg-muted">Powered by CheeseShop TECH</div>
      </div>
    </div>
  );
}
