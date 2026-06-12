import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Images,
  LogOut,
  LayoutGrid,
  Megaphone,
  MonitorPlay,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Breadcrumb } from "@/components/ui/breadcrumb.jsx";
import { MediaHub } from "@/components/media/media-hub.jsx";
import { CatalogPage } from "@/components/catalog/buyer-catalog.jsx";
import { PresentationsPage } from "@/components/presentations/presentations-page.jsx";
import { ProposalBuilder } from "@/components/proposals/proposal-builder.jsx";
import { ProposalView } from "@/components/proposals/proposal-view.jsx";
import { ToolsPage } from "@/components/tools/tools-page.jsx";
import { CampaignsPage } from "@/components/campaigns/campaigns-page.jsx";
import { FeaturedTool } from "@/components/tools/featured-tool.jsx";
import { PricingTool } from "@/components/tools/pricing-tool.jsx";
import { toolIcon } from "@/lib/icons.js";
import { OrdersPage } from "@/components/crm/crm-dashboard.jsx";
import { HomeHub } from "@/components/home/home-hub.jsx";
import { ComingSoon } from "@/components/marketing/coming-soon.jsx";
import { RequireAuth, RoleGate } from "@/components/auth/require-auth.jsx";
import { PasscodeGate } from "@/components/auth/passcode-gate.jsx";
import { SetPassword } from "@/components/auth/set-password.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf, getHashToken } from "@/lib/auth.js";
import { listClients, resolveClient } from "@/lib/clientConfig.js";
import { applyTheme } from "@/lib/theme.js";

const ALL_ROLES = ["admin", "client", "pr", "influencer", "creator"];
// Pilot passcode gate vs. per-user Identity (VITE_AUTH_MODE=passcode). See PasscodeGate / AUTH_AND_ROLES.md.
const Gate = import.meta.env.VITE_AUTH_MODE === "passcode" ? PasscodeGate : RequireAuth;
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, allowed: ["admin", "client"] },
  { key: "campaigns", label: "Campaigns", icon: Megaphone, allowed: ["admin", "client"] },
  { key: "catalog", label: "Catalog", icon: Package, allowed: ["admin", "client"] },
  { key: "orders", label: "Orders", icon: ShoppingCart, allowed: ["admin", "client"] },
  { key: "media", label: "Media hub", icon: Images, allowed: ALL_ROLES },
  { key: "tools", label: "Tools", icon: LayoutGrid, allowed: ["admin", "client"] },
];

export default function App({ initialResolved }) {
  const [resolved, setResolved] = useState(initialResolved);
  // ?page=<key> deep-links a portal page (e.g. share ?client=montitrentini&page=presentations
  // with a buyer — still behind the gate). Falls back to dashboard if the key isn't in nav.
  const [page, setPage] = useState(
    () => new URLSearchParams(window.location.search).get("page") || "dashboard"
  );
  const clients = listClients();
  const { user, logout } = useAuth();

  // Netlify Identity invite / recovery / confirmation links arrive as a hash token — handle
  // them before any routing (the link lands on the apex, which would otherwise show coming-soon).
  const hashToken = getHashToken();
  if (hashToken) {
    return <SetPassword brand={{ ...resolved.brand, isHouse: resolved.isHouse }} type={hashToken.type} token={hashToken.token} />;
  }

  // Apex (house view, no tenant subdomain) serves the public coming-soon page, so deploying the
  // app never replaces the public site. Portals live at <client>.cheeseshoptech.com. Staff reach
  // the app at the apex with ?app=1; ?client=<sub> previews a tenant in dev.
  const params = new URLSearchParams(window.location.search);
  if (resolved.isHouse && !params.has("app") && !params.has("client")) {
    return <ComingSoon />;
  }

  // Role-based nav: external collaborators (pr/influencer/creator) see only the Media hub.
  const userRoles = rolesOf(user);
  // Featured tools get their own top-level tab, placed right after Dashboard.
  const featuredTools = (resolved.tools || []).filter((t) => t.featured);
  const featuredNav = featuredTools.map((t) => ({
    key: `tool:${t.key}`, label: t.label, icon: toolIcon(t.icon), allowed: ["admin", "client"],
  }));
  // Presentations tab appears only for tenants with a configured deck (config-driven nav).
  const presentationsNav = resolved.presentations?.length
    ? [{ key: "presentations", label: "Presentations", icon: MonitorPlay, allowed: ["admin", "client"] }]
    : [];
  // Proposals builder is a Manage feature (F4, ADMIN_DASHBOARDS_SPEC §5) — both tiers:
  // house admins pitch prospects, client admins pitch their buyers.
  const proposalsNav = [{ key: "proposals", label: "Proposals", icon: FileText, allowed: ["admin", "client-admin"] }];
  const baseNav = [NAV[0], ...featuredNav, ...presentationsNav, ...proposalsNav, ...NAV.slice(1)];
  const nav = baseNav.filter((n) => n.allowed.some((r) => userRoles.includes(r)));
  // "proposal" (the rendered share link, ?page=proposal#p=…) is reachable by ANY portal
  // role — it's what a buyer opens — so it bypasses the nav-membership check.
  const effectivePage = page === "proposal" ? "proposal" : nav.some((n) => n.key === page) ? page : nav[0]?.key;
  const activeFeatured = featuredTools.find((t) => `tool:${t.key}` === effectivePage);

  function switchTenant(subdomain) {
    const next = resolveClient(subdomain || "house");
    applyTheme(next);
    const url = new URL(window.location.href);
    if (subdomain) {
      url.searchParams.set("client", subdomain);
      url.searchParams.delete("app");
    } else {
      // House view from inside the app = the admin/house portal, not the public coming-soon.
      url.searchParams.delete("client");
      url.searchParams.set("app", "1");
    }
    window.history.replaceState({}, "", url);
    setResolved(next);
  }

  // Admins (CheeseShop TECH staff) can preview/switch tenants; clients can't.
  const tenantSwitcher = (
    <RoleGate roles={["admin"]}>
      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <span className="hidden sm:inline">Tenant</span>
        <select
          className="rounded-base border border-border bg-bg px-2 py-1 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          value={resolved.isHouse ? "" : resolved.subdomain}
          onChange={(e) => switchTenant(e.target.value)}
        >
          <option value="">House (CheeseShop TECH)</option>
          {clients.map((c) => (
            <option key={c.subdomain} value={c.subdomain}>{c.brand.name}</option>
          ))}
        </select>
      </label>
    </RoleGate>
  );

  const userMenu = <UserMenu user={user} onLogout={logout} />;

  return (
    <Gate resolved={resolved}>
    <AppShell
      brand={resolved.brand}
      isHouse={resolved.isHouse}
      nav={nav}
      activeKey={effectivePage}
      onNavigate={setPage}
      topbarRight={<div className="flex items-center gap-4">{tenantSwitcher}{userMenu}</div>}
      breadcrumb={<Breadcrumb items={[{ label: resolved.brand.name, href: "#" }, { label: nav.find((n) => n.key === effectivePage)?.label }]} />}
    >
      {activeFeatured ? (
        activeFeatured.route === "pricing"
          ? <PricingTool resolved={resolved} />
          : <FeaturedTool tool={activeFeatured} resolved={resolved} />
      ) : effectivePage === "media" ? (
        <MediaHub resolved={resolved} />
      ) : effectivePage === "campaigns" ? (
        <CampaignsPage resolved={resolved} />
      ) : effectivePage === "tools" ? (
        <ToolsPage resolved={resolved} onNavigate={setPage} />
      ) : effectivePage === "dashboard" ? (
        <HomeHub resolved={resolved} onNavigate={setPage} />
      ) : effectivePage === "orders" ? (
        <OrdersPage resolved={resolved} />
      ) : effectivePage === "presentations" ? (
        <PresentationsPage resolved={resolved} />
      ) : effectivePage === "proposals" ? (
        <ProposalBuilder resolved={resolved} />
      ) : effectivePage === "proposal" ? (
        <ProposalView resolved={resolved} />
      ) : (
        <CatalogPage resolved={resolved} />
      )}
    </AppShell>
    </Gate>
  );
}

function UserMenu({ user, onLogout }) {
  const role = rolesOf(user)[0] || "member";
  const name = user?.user_metadata?.full_name || user?.email || "User";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight text-fg">{name}</p>
        <p className="text-xs capitalize leading-tight text-fg-muted">{role}</p>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-sm font-medium text-brand-on-primary">
        {initials}
      </div>
      <Button size="sm" variant="ghost" onClick={onLogout} aria-label="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

