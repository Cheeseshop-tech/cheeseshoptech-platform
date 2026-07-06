import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Check, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context.jsx";
import { listAssets, USAGE } from "@/lib/media.js";
import { cldUrl } from "@/lib/cloudinary.js";

// Tag-driven Media Hub picker (the "design element that reads the Media Hub tags").
// A compact trigger shows the current pick; clicking opens a dropdown panel with a usage-tag
// filter, a hover-preview pane (mouse over a thumb → slightly larger view, no clipping because
// the preview lives ABOVE the scroll area), and a scrollable thumbnail grid. Reads the SAME
// listAssets() seam as the Media Hub, so it shows live Cloudinary assets with their real tags.
// Reusable: proposal image zones now, slide-deck composer next.
export function MediaPicker({ resolved, value, onChange, defaultTag = "", label = "Choose image", allowClear = true }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tag, setTag] = useState(defaultTag);
  const [hover, setHover] = useState("");
  const rootRef = useRef(null);

  // Lazy-load assets the first time the panel opens.
  useEffect(() => {
    if (!open || assets.length || loading) return;
    let alive = true;
    setLoading(true); setErr("");
    listAssets({ tenantFolder: resolved.cloudinaryFolder, legacyFolders: resolved.cloudinaryLegacyFolders, user })
      .then((a) => { if (alive) setAssets(a || []); })
      .catch((e) => { if (alive) setErr(String(e?.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Only offer tags that actually exist on this tenant's assets.
  const tagsPresent = useMemo(() => {
    const s = new Set();
    assets.forEach((a) => (a.usage || []).forEach((u) => s.add(u)));
    return USAGE.filter((u) => s.has(u.id));
  }, [assets]);

  const shown = useMemo(
    () => assets.filter((a) => (tag ? (a.usage || []).includes(tag) : true)),
    [assets, tag]
  );

  const previewId = hover || value;

  return (
    <div className="relative" ref={rootRef}>
      {/* Trigger — current selection thumb + name, or placeholder. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-base border border-border bg-bg px-2 py-1.5 text-left text-sm transition-colors hover:border-brand-primary"
      >
        {value
          ? <img src={cldUrl(value, "thumb")} alt="" className="h-8 w-8 flex-none rounded-base border border-border bg-white object-contain" />
          : <ImageIcon className="h-5 w-5 flex-none text-fg-muted" />}
        <span className="flex-1 truncate text-fg-muted">{value ? value.split("/").pop() : label}</span>
        {allowClear && value && (
          <X
            className="h-4 w-4 flex-none text-fg-muted hover:text-fg"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            aria-label="Clear image"
          />
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-[min(30rem,92vw)] rounded-base border border-border bg-surface p-2 shadow-lg">
          {/* Tag filter */}
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="mb-2 h-8 w-full rounded-base border border-border bg-bg px-2 text-xs text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="">All tags ({assets.length})</option>
            {tagsPresent.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>

          {/* Hover-preview pane (lives above the scroll area so it never clips). */}
          <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-base border border-border bg-white">
            {previewId
              ? <img src={cldUrl(previewId, "card")} alt="" className="max-h-full max-w-full object-contain" />
              : <span className="text-xs text-fg-muted">Hover a thumbnail to preview</span>}
          </div>

          {/* Scrollable thumbnail grid */}
          {loading ? (
            <p className="p-4 text-center text-sm text-fg-muted">Loading Media Hub…</p>
          ) : err ? (
            <p className="p-4 text-center text-sm text-error">{err}</p>
          ) : shown.length === 0 ? (
            <p className="p-4 text-center text-sm text-fg-muted">No assets {tag ? "with this tag" : "found"}.</p>
          ) : (
            <div className="grid max-h-60 grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-6">
              {shown.map((a) => (
                <button
                  key={a.publicId}
                  type="button"
                  onMouseEnter={() => setHover(a.publicId)}
                  onMouseLeave={() => setHover("")}
                  onClick={() => { onChange(a.publicId); setOpen(false); }}
                  title={a.title || a.publicId}
                  className={
                    "relative aspect-square overflow-hidden rounded-base border bg-white transition-colors " +
                    (value === a.publicId ? "border-brand-primary ring-2 ring-brand-primary/40" : "border-border hover:border-brand-primary")
                  }
                >
                  <img src={cldUrl(a.publicId, "thumb")} alt={a.title || ""} loading="lazy" className="h-full w-full object-contain" />
                  {value === a.publicId && (
                    <span className="absolute right-0.5 top-0.5 rounded-full bg-brand-primary p-0.5 text-white"><Check className="h-3 w-3" /></span>
                  )}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 truncate text-[10px] text-fg-muted">Media Hub · {shown.length} shown{tag ? " · filtered" : ""}</p>
        </div>
      )}
    </div>
  );
}
