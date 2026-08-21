import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Images,
  LogOut,
  Layers,
  Megaphone,
  Contact,
  MonitorPlay,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Breadcrumb } from "@/components/ui/breadcrumb.jsx";
import { MediaHub } from "@/components/media/media-hub.jsx";
import { CatalogPage } from "@/components/catalog/buyer-catalog.jsx";
import { PresentationsPage } from "@/components/presentations/presentations-page.jsx";
import { ContentStudio } from "@/components/proposals/content-studio.jsx";
import { ProposalView } from "@/components/proposals/proposal-view.jsx";
import { BrandManagement } from "@/components/brand/brand-management.jsx";
import { BrandSystemsPage } from "@/components/brand/brand-systems-page.jsx";
import { ContentEnginePage } from "@/components/tools/content-engine-page.jsx";
import { CampaignsPage } from "@/components/campaigns/campaigns-page.jsx";
import { FeaturedTool } from "@/components/tools/featured-tool.jsx";
import { PricingTool } from "@/components/tools/pricing-tool.jsx";
import { BoothTool } from "@/components/tools/booth-tool.jsx";
import { toolIcon } from "@/lib/icons.js";
import { OrdersPage } from "@/components/crm/crm-dashboard.jsx";
import { CrmPage } from "@/components/crm/crm-page.jsx";
import { HomeHub } from "@/components/home/home-hub.jsx";
import { SignInPage } from "@/components/marketing/sign-in-page.jsx";
import { RequireAuth, RoleGate } from "@/components/auth/require-auth.jsx";
import { PasscodeGate } from "@/components/auth/passcode-gate.jsx";
import { SetPassword } from "@/components/auth/set-password.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf, getHashToken } from "@/lib/auth.js";
import { listClients, resolveClient } from "@/lib/clientConfig.js";
import { applyTheme } from "@/lib/theme.js";

// Pilot passcode gate vs. per-user Identity (VITE_AUTH_MODE=passcode). See PasscodeGate / AUTH_AND_ROLES.md.
const Gate = import.meta.env.VITE_AUTH_MODE === "passcode" ? PasscodeGate : RequireAuth;
// 2026-07-02 reorg (Rick): "Tools" is now the CONTENT ENGINE — Content Studio / Content Library /
// Brand Systems / Brand Kits / Brand Voice / Media Hub all live under it as app cards, so their
// old top-level tabs are gone. Media hub keeps a direct tab ONLY for external collaborators
// (pr/influencer/creator), whose whole portal is the hub. Route keys stay stable ("tools").
// Sales-rep/broker access (Rick, 2026-07-06 — "client" tier v1): Dashboard, CRM, Price List,
// Product Catalog, Content Library. Explicitly NOT Campaigns/Orders/the full Content Engine hub
// (Content Studio, Brand Systems/Kits/Voice, Media Hub) — those stay admin/client-admin only.
// Content Library gets its OWN nav tab (below) rather than exposing the whole Content Engine
// hub, which would also surface Media Hub. Widen deliberately later, one line at a time.
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, allowed: ["admin", "client"] },
  { key: "campaigns", label: "Campaign Management", icon: Megaphone, allowed: ["admin"] },
  { key: "orders", label: "Orders", icon: ShoppingCart, allowed: ["admin"] },
  { key: "crm", label: "CRM", icon: Contact, allowed: ["admin", "client"] },
  { key: "presentations", label: "Content Library", icon: MonitorPlay, allowed: ["admin", "client"] },
  { key: "media", label: "Media hub", icon: Images, allowed: ["pr", "influencer", "creator"] },
  { key: "tools", label: "Content Engine", icon: Layers, allowed: ["admin"] },
];
// Sidebar order (Rick, 2026-07-02): Dashboard · Pricing & Inventory · CRM · Campaigns · Orders ·
// Content Engine · Storefront. Featured-tool tabs (tool:<key>) slot in by config key. Keys not
// listed here sort after the listed ones, in assembly order.
// Product catalog back ON the sidebar as a featured-tool tab (Rick, 2026-07-04) — it's the
// item-driven price-list mirror now, a first-class daily surface.
// Booth-to-Meeting sits next to CRM: it's the field end of the same account book (it reads the
// HubSpot companies CRM reads, and pushes contacts back through crm-push).
const NAV_ORDER = ["dashboard", "tool:price-list", "crm", "tool:booth", "campaigns", "orders", "tool:buyer-catalog", "presentations", "tools", "tool:shopify", "media"];
// Pages reachable WITHOUT a nav tab: buyer share links + Opportunity-Engine compose (as before),
// plus the Content Engine's apps (their tabs moved into the engine page's cards). `catalog`
// stays listed so dashboard cards + ?page=catalog deep links keep working alongside the tab.
const NON_NAV_PAGES = ["proposal", "compose", "media", "proposals", "presentations", "brand", "catalog", "brand-systems"];
const NON_NAV_LABELS = {
  proposal: "Proposal",
  compose: "Compose",
  media: "Media Hub",
  proposals: "Compose",
  presentations: "Content Library",
  brand: "Brand Kits",
  catalog: "Product Catalog",
  "brand-systems": "Brand Systems",
};

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

  // Apex (no subdomain) serves the PUBLIC landing page so deploying the app never replaces the
  // marketing site. House/app entry = a reserved STAFF subdomain (admin/app/console) OR the legacy
  // ?app=1 flag; <client>.cheeseshoptech.com (or ?client=<sub> in dev) loads a tenant portal.
  const params = new URLSearchParams(window.location.search);
  const STAFF_HOSTS = ["admin", "app", "console"];
  const staffEntry = params.has("app") || STAFF_HOSTS.includes(resolved.subdomain || "");
  if (resolved.isHouse && !staffEntry && !params.has("client")) {
    // ONE ADDRESS (2026-07-02): the platform site serves the apex itself.
    // 2026-08-21 (Rick): the apex is now the SIGN-IN page — "CheeseShop TECH · Cheese Merchant
    // Business Tools", one simple door with the real Identity form on it, no marketing detail.
    // It hands off to ?app=1 on success, the same staff entry checked above. ComingSoon and the
    // invite-only LandingPage (marketing/landing-page.jsx) are both kept for a future marketing
    // launch — swap either back here.
    return <SignInPage brand={resolved.brand} />;
  }

  // Role-based nav: external collaborators (pr/influencer/creator) see only the Media hub.
  const userRoles = rolesOf(user);
  // Featured tools get their own top-level tab, placed right after Dashboard.
  const featuredTools = (resolved.tools || []).filter((t) => t.featured);
  // A tool's own `allowed` (config/clients/<tenant>.json) wins when set (e.g. Storefront/
  // Campaigns restricted to admin, 2026-07-06); default stays open to admin+client as before.
  const featuredNav = featuredTools.map((t) => ({
    key: `tool:${t.key}`, label: t.label, icon: toolIcon(t.icon), allowed: t.allowed || ["admin", "client"],
  }));
  // Content Studio / Content Library / Brand kits tabs are GONE from the top level — they live
  // as cards inside the Content Engine page now (2026-07-02 reorg). Routes stay reachable via
  // NON_NAV_PAGES so engine cards, deep links (?page=presentations for buyers) and the
  // Opportunity-Engine compose jump all keep working.
  const baseNav = [NAV[0], ...featuredNav, ...NAV.slice(1)];
  const orderOf = (key) => { const i = NAV_ORDER.indexOf(key); return i === -1 ? NAV_ORDER.length : i; };
  const nav = baseNav
    .filter((n) => n.allowed.some((r) => userRoles.includes(r)))
    .sort((a, b) => orderOf(a.key) - orderOf(b.key));
  const bypassNav = NON_NAV_PAGES.includes(page);
  const effectivePage = bypassNav ? page : nav.some((n) => n.key === page) ? page : nav[0]?.key;
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
      breadcrumb={<Breadcrumb items={[{ label: resolved.brand.name, href: "#" }, { label: nav.find((n) => n.key === effectivePage)?.label || NON_NAV_LABELS[effectivePage] }]} />}
    >
      {activeFeatured ? (
        activeFeatured.route === "pricing"
          ? <PricingTool resolved={resolved} onNavigate={setPage} />
          : activeFeatured.route === "catalog"
            ? <CatalogPage resolved={resolved} />
            : activeFeatured.route === "booth"
              ? <BoothTool resolved={resolved} />
              : <FeaturedTool tool={activeFeatured} resolved={resolved} />
      ) : effectivePage === "media" ? (
        <MediaHub resolved={resolved} />
      ) : effectivePage === "campaigns" ? (
        <CampaignsPage resolved={resolved} />
      ) : effectivePage === "tools" ? (
        <ContentEnginePage resolved={resolved} onNavigate={setPage} />
      ) : effectivePage === "dashboard" ? (
        <HomeHub resolved={resolved} onNavigate={setPage} />
      ) : effectivePage === "orders" ? (
        <OrdersPage resolved={resolved} />
      ) : effectivePage === "crm" ? (
        <CrmPage resolved={resolved} onNavigate={setPage} />
      ) : effectivePage === "presentations" ? (
        // Content Library: gate matches its nav `allowed` (admin+client) — closes the
        // pre-existing direct-URL gap (?page=presentations rendered with no role check).
        <RoleGate roles={["admin", "client"]} fallback={<AccessNotice need={`a ${resolved.brand.name} portal`} />}>
          <PresentationsPage resolved={resolved} />
        </RoleGate>
      ) : effectivePage === "proposals" || effectivePage === "compose" ? (
        <ContentStudio resolved={resolved} />
      ) : effectivePage === "proposal" ? (
        <ProposalView resolved={resolved} />
      ) : effectivePage === "brand" ? (
        // Brand kits is house-admin only; now that the route bypasses nav-membership, gate it here.
        <RoleGate roles={["admin"]} fallback={<AccessNotice need="a CheeseShop TECH house admin" />}>
          <BrandManagement />
        </RoleGate>
      ) : effectivePage === "brand-systems" ? (
        // The BSE, integrated + behind the gate (was the ungated public /tools/ path).
        <RoleGate roles={["admin", "client-admin"]} fallback={<AccessNotice need="an admin" />}>
          <BrandSystemsPage />
        </RoleGate>
      ) : (
        <CatalogPage resolved={resolved} />
      )}
    </AppShell>
    </Gate>
  );
}

// Friendly wall for role-gated pages — never render a silently blank content area.
function AccessNotice({ need }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-center">
      <div>
        <p className="cs-display text-xl text-brand-primary">This page needs {need} sign-in.</p>
        <p className="mt-2 text-sm text-fg-muted">You're signed in with a code that doesn't include this page — re-enter with the right passcode.</p>
      </div>
    </div>
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

