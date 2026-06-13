import { useEffect, useState, useRef } from "react";
import { Upload, Copy, Image as ImageIcon, Lock } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog.jsx";
import { useToast } from "@/components/ui/toast.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { cldUrl, uploadAsset, UPLOAD_PRESET } from "@/lib/cloudinary.js";
import { listAssets, FOLDERS, APPROVAL, canUpload, canManageMedia } from "@/lib/media.js";

export function MediaHub({ resolved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [folder, setFolder] = useState("products");
  const [assets, setAssets] = useState(null);
  const [active, setActive] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setAssets(null);
    listAssets({ folder, tenantFolder: resolved.cloudinaryFolder, user }).then((a) => {
      if (alive) setAssets(a);
    });
    return () => { alive = false; };
  }, [folder, resolved.cloudinaryFolder, user]);

  function onUpload() {
    if (!UPLOAD_PRESET) {
      toast({
        title: "Upload not configured",
        description: "Set a Cloudinary unsigned upload preset (VITE_CLOUDINARY_UPLOAD_PRESET) to enable uploads.",
        tone: "warning",
      });
      return;
    }
    fileRef.current?.click();
  }

  async function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const asset = await uploadAsset({ file, tenantFolder: resolved.cloudinaryFolder, subfolder: folder });
        uploaded.push(asset);
      }
      // New uploads are tagged "draft" — show them if the current role can see drafts.
      setAssets((list) => [...uploaded, ...(list || [])]);
      toast({ title: `Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}`, description: "Tagged draft — set approval to publish.", tone: "success" });
    } catch (err) {
      toast({ title: "Upload failed", description: String(err?.message || err), tone: "error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-fg">Media hub</h1>
          <p className="mt-1 text-fg-muted">
            {resolved.brand.name} · <code className="font-mono text-sm">{resolved.cloudinaryFolder}</code>
          </p>
        </div>
        {canUpload(user) && (
          <>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFilesSelected} />
            <Button variant="primary" onClick={onUpload} disabled={uploading}>
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
            </Button>
          </>
        )}
      </div>

      <Tabs value={folder} onValueChange={setFolder}>
        <TabsList>
          {FOLDERS.map((f) => (
            <TabsTrigger key={f} value={f} className="capitalize">{f}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={folder}>
          {assets === null ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full" />)}
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="Nothing here yet"
              description="No assets in this folder are available to your role."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((a) => (
                <AssetTile key={a.publicId} asset={a} onOpen={() => setActive(a)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AssetDialog
        asset={active}
        onClose={() => setActive(null)}
        canManage={canManageMedia(user)}
        onCopy={(url) => { navigator.clipboard?.writeText(url); toast({ title: "Link copied", tone: "success" }); }}
        onStateChange={(s) => {
          setActive((a) => ({ ...a, approvalState: s }));
          setAssets((list) => list?.map((x) => x.publicId === active.publicId ? { ...x, approvalState: s } : x));
          toast({ title: "Approval updated", description: APPROVAL[s].label, tone: "success" });
        }}
      />
    </div>
  );
}

function AssetTile({ asset, onOpen }) {
  const ap = APPROVAL[asset.approvalState];
  return (
    <button onClick={onOpen} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-base">
      <Card className="overflow-hidden">
        <img
          src={cldUrl(asset.publicId, "card")}
          alt={asset.title}
          loading="lazy"
          className="aspect-square w-full bg-white object-cover transition-opacity group-hover:opacity-90"
        />
        <div className="p-3">
          <p className="truncate text-sm font-medium text-fg">{asset.title}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {asset.sku ? <span className="font-mono text-xs text-fg-muted">{asset.sku}</span> : <span />}
            <Badge variant={ap.tone}>{ap.label}</Badge>
          </div>
        </div>
      </Card>
    </button>
  );
}

function AssetDialog({ asset, onClose, canManage, onCopy, onStateChange }) {
  if (!asset) return null;
  const heroUrl = cldUrl(asset.publicId, "hero");
  const deliveryUrl = cldUrl(asset.publicId, "original");
  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{asset.title}</DialogTitle>
          <DialogDescription>
            {asset.sku ? <span className="font-mono">{asset.sku}</span> : "Brand / lifestyle asset"} · {asset.folder}
          </DialogDescription>
        </DialogHeader>

        <img src={heroUrl} alt={asset.title} className="max-h-[55vh] w-full rounded-base bg-white object-contain" />

        <div className="mt-4 flex items-center justify-between gap-3">
          <Badge variant={APPROVAL[asset.approvalState].tone}>{APPROVAL[asset.approvalState].label}</Badge>
          <Button size="sm" variant="outline" onClick={() => onCopy(deliveryUrl)}>
            <Copy className="h-4 w-4" /> Copy delivery URL
          </Button>
        </div>

        {canManage ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-fg">Set approval</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(APPROVAL).map(([key, v]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={key === asset.approvalState ? "primary" : "outline"}
                  onClick={() => onStateChange(key)}
                >
                  {v.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-4 text-xs text-fg-muted">
            <Lock className="h-3.5 w-3.5" /> Approval is managed by the brand team.
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
