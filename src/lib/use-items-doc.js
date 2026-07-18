// Items-doc hook — the canonical item IDENTITY + COPY record (Media Hub items.js,
// per-tenant items.json in Cloudinary) for React surfaces. DATA_OWNERSHIP_MAP.md:
// name/copy come from here; catalog.json keeps price + pack specs; joined by SKU code.
//
// Never blocks or breaks a surface: returns null until loaded (and stays null on any
// failure), and every consumer falls back to catalog.json's own `name` for a SKU that
// has no items record — same pattern as studio-director.js directDraft(). This matters
// most on buyer-facing surfaces (proposal-view): a failed items fetch must never blank
// a product name.
import { useEffect, useState } from "react";
import { loadItems } from "./items.js";

/** @returns {object|null} the tenant's items doc, or null while loading / on failure */
export function useItemsDoc(resolved) {
  const [doc, setDoc] = useState(null);
  const folder = resolved?.cloudinaryFolder;
  useEffect(() => {
    let alive = true;
    setDoc(null);
    if (!folder) return undefined;
    loadItems(folder, resolved?.id).then((d) => { if (alive) setDoc(d); }).catch(() => { /* keep null → catalog fallback */ });
    return () => { alive = false; };
  }, [folder]);
  return doc;
}
