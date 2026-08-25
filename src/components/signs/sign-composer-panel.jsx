import { useEffect, useRef, useState } from "react";
import signsData from "@/data/montitrentini/signs.json";
import { brandTokens } from "@/lib/brand-tokens.js";

// Cheese signs — the Sign Composer, mounted as a Compose tab.
//
// The composer is a standalone document (design/sign-composer/sign-composer.html, copied
// to public/ at build time) rather than a React port. That is deliberate for now:
// docs/SIGN_COMPOSER_SPEC_2026-08-25.md §9 calls it "not the in-app editor — a standalone
// tool for settling layouts", and one source of truth beats two diverging copies. What the
// frame does NOT get for free is live data, so we hand it in over postMessage: the tenant's
// real sign records and its resolved Brand Kit, instead of the build-time snapshot the
// standalone file falls back to.
//
// A native port is still the real integration — this gets the tool in front of people first.
const SRC = "/sign-composer/sign-composer.html";

function recordsFor(resolved) {
  const all = Array.isArray(signsData) ? signsData : signsData?.signs || [];
  const family = all.filter((s) => s.family === "asiago");
  return family.length ? family : all;
}

export function SignComposerPanel({ resolved }) {
  const frame = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMsg(ev) {
      if (ev.data?.type !== "cst:sign-composer:ready") return;
      setReady(true);
      const t = brandTokens(resolved) || {};
      frame.current?.contentWindow?.postMessage({
        type: "cst:sign-composer:data",
        live: true,
        tenant: resolved?.brandName || resolved?.name || "the platform",
        records: recordsFor(resolved),
        tokens: { ...(t.colors || {}), ...(t.fonts || {}), muted: t.colors?.charcoal },
      }, window.location.origin);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [resolved]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">
          Printed case signs and shelf talkers. Arrange the pieces, check all four cheeses at once,
          then export the manifest for <code className="text-xs">sign-templates.js</code> — or a
          300&nbsp;DPI PNG.
        </p>
        <a href={SRC} target="_blank" rel="noreferrer"
           className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-fg hover:bg-fg/5">
          Open in its own tab ↗
        </a>
      </div>
      <div className="overflow-hidden rounded-base border border-border bg-bg">
        <iframe
          ref={frame}
          src={SRC}
          title="Sign Composer"
          className="block h-[calc(100vh-16rem)] min-h-[640px] w-full border-0"
        />
      </div>
      <p className="mt-2 text-xs text-fg-muted">
        {ready
          ? "Reading this tenant's live sign records and Brand Kit."
          : "Loading — if it stays blank, the composer needs JavaScript enabled in the frame."}
      </p>
    </div>
  );
}
