import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Images,
  Plus,
  Inbox,
  LogOut,
  LayoutGrid,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Breadcrumb } from "@/components/ui/breadcrumb.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.jsx";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select.jsx";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { MediaHub } from "@/components/media/media-hub.jsx";
import { ToolsPage } from "@/components/tools/tools-page.jsx";
import { FeaturedTool } from "@/components/tools/featured-tool.jsx";
import { toolIcon } from "@/lib/icons.js";
import { CrmDashboard, OrdersPage } from "@/components/crm/crm-dashboard.jsx";
import { ComingSoon } from "@/components/marketing/coming-soon.jsx";
import { RequireAuth, RoleGate } from "@/components/auth/require-auth.jsx";
import { SetPassword } from "@/components/auth/set-password.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf, getHashToken } from "@/lib/auth.js";
import { listClients, resolveClient } from "@/lib/clientConfig.js";
import { applyTheme } from "@/lib/theme.js";

const ALL_ROLES = ["admin", "client", "pr", "influencer", "creator"];
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, allowed: ["admin", "client"] },
  { key: "catalog", label: "Catalog", icon: Package, allowed: ["admin", "client"] },
  { key: "orders", label: "Orders", icon: ShoppingCart, allowed: ["admin", "client"] },
  { key: "media", label: "Media hub", icon: Images, allowed: ALL_ROLES },
  { key: "tools", label: "Tools", icon: LayoutGrid, allowed: ["admin", "client"] },
];

const PRODUCTS = [
  { sku: "MT-ASIA-200", name: "Asiago DOP", pack: "12 × 200g", status: "Active" },
  { sku: "MT-GORG-150", name: "Gorgonzola Dolce", pack: "8 × 150g", status: "Active" },
  { sku: "MT-GRAN-1K", name: "Grana Padano wedge", pack: "6 × 1kg", status: "Low stock" },
];

export default function App({ initialResolved }) {
  const [resolved, setResolved] = useState(initialResolved);
  const [page, setPage] = useState("catalog");
  const clients = listClients();
  const { toast } = useToast();
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
  const baseNav = [NAV[0], ...featuredNav, ...NAV.slice(1)];
  const nav = baseNav.filter((n) => n.allowed.some((r) => userRoles.includes(r)));
  const effectivePage = nav.some((n) => n.key === page) ? page : nav[0]?.key;
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
    <RequireAuth resolved={resolved}>
    <AppShell
      brand={resolved.brand}
      nav={nav}
      activeKey={effectivePage}
      onNavigate={setPage}
      topbarRight={<div className="flex items-center gap-4">{tenantSwitcher}{userMenu}</div>}
      breadcrumb={<Breadcrumb items={[{ label: resolved.brand.name, href: "#" }, { label: nav.find((n) => n.key === effectivePage)?.label }]} />}
    >
      {activeFeatured ? (
        <FeaturedTool tool={activeFeatured} resolved={resolved} />
      ) : effectivePage === "media" ? (
        <MediaHub resolved={resolved} />
      ) : effectivePage === "tools" ? (
        <ToolsPage resolved={resolved} onNavigate={setPage} />
      ) : effectivePage === "dashboard" ? (
        <CrmDashboard resolved={resolved} />
      ) : effectivePage === "orders" ? (
        <OrdersPage resolved={resolved} />
      ) : (
      <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-fg">Catalog</h1>
          <p className="mt-1 text-fg-muted">Themed live for {resolved.brand.name} — one shared shell.</p>
        </div>
        <NewProductDialog onCreate={() => toast({ title: "Product saved", description: "Added to the catalog.", tone: "success" })} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active SKUs" value="42" badge={<Badge variant="success">+3</Badge>} />
        <StatCard label="Open orders" value="7" badge={<Badge variant="warning">2 late</Badge>} />
        <StatCard label="Media assets" value="318" badge={<Badge variant="info">synced</Badge>} />
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="new">Add product</TabsTrigger>
          <TabsTrigger value="empty">Drafts</TabsTrigger>
          <TabsTrigger value="loading">Loading</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Case pack</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PRODUCTS.map((p) => (
                <TableRow key={p.sku}>
                  <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-fg-muted">{p.pack}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "Active" ? "success" : "warning"}>{p.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="new">
          <ProductForm onSubmit={() => toast({ title: "Draft saved", tone: "info" })} />
        </TabsContent>

        <TabsContent value="empty">
          <EmptyState
            icon={Inbox}
            title="No drafts yet"
            description="Products you start but don't publish will show up here."
            action={<Button size="sm" variant="primary"><Plus className="h-4 w-4" /> New draft</Button>}
          />
        </TabsContent>

        <TabsContent value="loading">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-5/6" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </TabsContent>
      </Tabs>
      </>
      )}
    </AppShell>
    </RequireAuth>
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

function StatCard({ label, value, badge }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-fg-muted">{label}</p>
          <p className="mt-1 font-heading text-2xl text-fg">{value}</p>
        </div>
        {badge}
      </CardContent>
    </Card>
  );
}

function ProductForm({ onSubmit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New product</CardTitle>
        <CardDescription>All controls below are token-themed and keyboard-accessible.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="pname">Product name</Label>
          <Input id="pname" placeholder="e.g. Asiago DOP" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pcat">Category</Label>
          <Select>
            <SelectTrigger id="pcat"><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hard">Hard cheese</SelectItem>
              <SelectItem value="soft">Soft cheese</SelectItem>
              <SelectItem value="blue">Blue cheese</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pdesc">Description</Label>
          <Textarea id="pdesc" placeholder="Short, sensory product copy…" />
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-fg">Channel</legend>
          <RadioGroup defaultValue="retail" className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="retail" /> Retail</label>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="dtc" /> DTC</label>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="both" /> Both</label>
          </RadioGroup>
        </fieldset>
        <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked /> Show on storefront</label>
        <label className="flex items-center gap-2 text-sm"><Switch /> Feature on homepage</label>
        <Button variant="primary" onClick={onSubmit}>Save draft</Button>
      </CardContent>
    </Card>
  );
}

function NewProductDialog({ onCreate }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary"><Plus className="h-4 w-4" /> New product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create product</DialogTitle>
          <DialogDescription>Quick-add a SKU. Full details can be edited later.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="quick-name">Name</Label>
          <Input id="quick-name" placeholder="Product name" />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <DialogClose asChild><Button variant="primary" onClick={onCreate}>Create</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
