import { useState, useEffect } from "react";
import { Plus, Upload, Rocket } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table.jsx";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select.jsx";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { getStore, saveStore, fetchStoreProducts, fetchStoreOrders } from "@/lib/store.js";

const FONTS = ["Inter", "Fraunces", "Playfair Display", "Lora", "Source Sans 3", "Work Sans", "Merriweather"];
const ORDER_TONE = { Paid: "info", Fulfilled: "success", Refunded: "error" };
const money = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

// Store back-office, gated to admin/client (reuses the portal login). Scaffolded against the mock
// store model; "Publish" is a seam that will push to the live store later (src/lib/store.js).
export function StorefrontAdmin({ resolved }) {
  const { toast } = useToast();
  const [store, setStore] = useState(() => getStore(resolved));

  // Hydrate products + web orders from the live backend (Shopify in headless mode; the seed list
  // otherwise, so the mock path is unchanged). Theme/content/settings stay portal-owned.
  useEffect(() => {
    let alive = true;
    Promise.all([fetchStoreProducts(resolved), fetchStoreOrders(resolved)]).then(([products, orders]) => {
      if (alive) setStore((s) => (s ? { ...s, products, orders } : s));
    });
    return () => { alive = false; };
  }, [resolved]);

  if (!store) {
    return <p className="text-fg-muted">No store configured for this tenant yet.</p>;
  }

  const set = (patch) => setStore((s) => ({ ...s, ...patch }));
  const setTheme = (patch) => set({ theme: { ...store.theme, ...patch } });
  const setHero = (patch) => set({ theme: { ...store.theme, hero: { ...store.theme.hero, ...patch } } });
  const setSettings = (patch) => set({ settings: { ...store.settings, ...patch } });

  async function publish() {
    await saveStore(resolved, store);
    toast({ title: "Changes saved", description: "These would publish to the live store.", tone: "success" });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-3">
        <Badge variant={store.settings.status === "live" ? "success" : "warning"}>
          {store.settings.status === "live" ? "Store live" : "Maintenance mode"}
        </Badge>
        <Button variant="primary" onClick={publish}><Rocket className="h-4 w-4" /> Publish changes</Button>
      </div>

      <Tabs defaultValue="design">
        <TabsList>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* DESIGN */}
        <TabsContent value="design">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Brand & theme</CardTitle><CardDescription>Look-and-feel of the storefront.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <ColorField label="Primary color" value={store.theme.primary} onChange={(v) => setTheme({ primary: v })} />
                <ColorField label="Accent color" value={store.theme.accent} onChange={(v) => setTheme({ accent: v })} />
                <div className="grid gap-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input id="logo" placeholder="https://…/logo.svg" value={store.theme.logo} onChange={(e) => setTheme({ logo: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FontField label="Heading font" value={store.theme.heading} onChange={(v) => setTheme({ heading: v })} />
                  <FontField label="Body font" value={store.theme.body} onChange={(v) => setTheme({ body: v })} />
                </div>
                <div className="grid gap-2">
                  <Label>Layout</Label>
                  <Select value={store.theme.layout} onValueChange={(v) => setTheme({ layout: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                      <SelectItem value="editorial">Editorial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Hero</CardTitle><CardDescription>Homepage headline & banner.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="hh">Headline</Label>
                  <Input id="hh" value={store.theme.hero.headline} onChange={(e) => setHero({ headline: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hs">Subheadline</Label>
                  <Textarea id="hs" value={store.theme.hero.subhead} onChange={(e) => setHero({ subhead: e.target.value })} />
                </div>
                <Button variant="outline" size="sm"><Upload className="h-4 w-4" /> Upload hero image</Button>
                <div className="rounded-base border border-border p-4" style={{ background: store.theme.primary }}>
                  <p className="font-heading text-lg text-white">{store.theme.hero.headline}</p>
                  <p className="text-sm text-white/80">{store.theme.hero.subhead}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PRODUCTS */}
        <TabsContent value="products">
          <div className="mb-4 flex justify-end">
            <ProductDialog onSave={(p) => { set({ products: [...store.products, p] }); toast({ title: "Product added", tone: "success" }); }} />
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>SKU</TableHead><TableHead>Product</TableHead><TableHead>Price</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {store.products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono">{money(p.price)}</TableCell>
                  <TableCell className="max-w-xs truncate text-fg-muted">{p.description}</TableCell>
                  <TableCell><Badge variant={p.status === "Active" ? "success" : "warning"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* CONTENT */}
        <TabsContent value="content">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Announcement bar</CardTitle></CardHeader>
              <CardContent>
                <Input value={store.content.announcement} onChange={(e) => set({ content: { ...store.content, announcement: e.target.value } })} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Banners</CardTitle><CardDescription>Toggle what's live on the homepage.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {store.content.banners.map((b, i) => (
                  <ToggleRow key={b.key} label={b.label} checked={b.published}
                    onChange={(v) => { const banners = [...store.content.banners]; banners[i] = { ...b, published: v }; set({ content: { ...store.content, banners } }); }} />
                ))}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Pages</CardTitle><CardDescription>Published pages on the store.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {store.content.pages.map((pg, i) => (
                  <ToggleRow key={pg.key} label={pg.label} checked={pg.published}
                    onChange={(v) => { const pages = [...store.content.pages]; pages[i] = { ...pg, published: v }; set({ content: { ...store.content, pages } }); }} />
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {store.orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.customer}</TableCell>
                  <TableCell className="font-mono">{money(o.total)}</TableCell>
                  <TableCell className="text-fg-muted">{o.date}</TableCell>
                  <TableCell><Badge variant={ORDER_TONE[o.status] || "muted"}>{o.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings">
          <Card className="max-w-xl">
            <CardHeader><CardTitle>Store settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow label="Store live (off = maintenance mode)" checked={store.settings.status === "live"}
                onChange={(v) => setSettings({ status: v ? "live" : "maintenance" })} />
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Currency</Label>
                  <Select value={store.settings.currency} onValueChange={(v) => setSettings({ currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ship">Flat shipping</Label>
                  <Input id="ship" type="number" value={store.settings.shippingFlat} onChange={(e) => setSettings({ shippingFlat: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Payment provider</Label>
                <Select value={store.settings.payment} onValueChange={(v) => setSettings({ payment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="shopify-payments">Shopify Payments</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <span className="h-9 w-9 shrink-0 rounded-base border border-border" style={{ background: value }} />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </div>
  );
}

function FontField({ label, value, onChange }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-fg">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ProductDialog({ onSave }) {
  const [f, setF] = useState({ id: "", name: "", price: "", description: "", collection: "", status: "Active" });
  const upd = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary"><Plus className="h-4 w-4" /> Add product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>Name, price, and description appear on the storefront.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label htmlFor="psku">SKU</Label><Input id="psku" value={f.id} onChange={(e) => upd("id", e.target.value)} placeholder="MT-…" /></div>
            <div className="grid gap-2"><Label htmlFor="pprice">Price (USD)</Label><Input id="pprice" type="number" value={f.price} onChange={(e) => upd("price", e.target.value)} /></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="pname">Name</Label><Input id="pname" value={f.name} onChange={(e) => upd("name", e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="pdesc">Description</Label><Textarea id="pdesc" value={f.description} onChange={(e) => upd("description", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <DialogClose asChild>
            <Button variant="primary" onClick={() => onSave({ ...f, price: Number(f.price) || 0, id: f.id || `NEW-${Date.now()}` })}>Add product</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
