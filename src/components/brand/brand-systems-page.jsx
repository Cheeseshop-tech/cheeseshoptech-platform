import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton.jsx";

// Brand Systems Engine, INTEGRATED (Rick, 2026-07-02: "integrate into the main site under
// Content Engine"). The engine's single-file HTML now ships INSIDE the app bundle
// (src/assets/brand-systems-engine.html, lazy-loaded ?raw so it stays out of the main chunk)
// and renders in a sandboxed-by-origin iframe via srcDoc — which means:
//   1. It sits BEHIND the passcode gate (closes the "gate the BSE" open item — the old public
//      /tools/brand-systems-engine/ path is removed).
//   2. srcDoc inherits the app's origin, so the engine's localStorage kits live in the same
//      store as the rest of the portal.
// Iterate = edit the source in Projects/Monti trentini Ecommerce strategy/, re-copy to
// src/assets/ (back-button block stripped — the portal provides the chrome).
export function BrandSystemsPage() {
  const [html, setHtml] = useState(null);

  useEffect(() => {
    let alive = true;
    import("@/assets/brand-systems-engine.html?raw").then((m) => {
      if (alive) setHtml(m.default);
    });
    return () => { alive = false; };
  }, []);

  if (html === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  return (
    <div className="-m-2 overflow-hidden rounded-xl border border-border bg-white">
      <iframe
        srcDoc={html}
        title="Brand Systems Engine"
        className="block h-[calc(100vh-9.5rem)] w-full"
      />
    </div>
  );
}
