import { useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";

// Pilot passcode gate (VITE_AUTH_MODE=passcode). A single shared passcode unlocks the portal —
// checked server-side by netlify/functions/gate.js against PORTAL_PASSCODE. On success the auth
// context grants a synthetic "client" session. Replaces RequireAuth for the single-client pilot
// until per-user auth (Clerk) lands. See docs/AUTH_AND_ROLES.md.
export function PasscodeGate({ resolved, children }) {
  const { user, unlock } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return children;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Vite dev has no functions server — verify against the dev passcodes locally (three
      // tiers, mirroring functions/gate.js). import.meta.env.DEV is false in any production
      // build, so this branch can never run on the deployed site.
      if (import.meta.env.DEV) {
        const dev = {
          client: import.meta.env.VITE_PORTAL_PASSCODE || "monti",
          "client-admin": import.meta.env.VITE_PORTAL_ADMIN_PASSCODE || "monti-admin",
          admin: import.meta.env.VITE_HOUSE_PASSCODE || "house",
        };
        const role = Object.keys(dev).find((r) => code && code === dev[r]);
        if (role) return unlock(role);
        setError("Incorrect passcode.");
        return;
      }
      const res = await fetch("/.netlify/functions/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode: code, tenant: resolved.subdomain || "" }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return unlock(data.role || "client");
      }
      setError("Incorrect passcode.");
    } catch {
      setError("Couldn't verify — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const brand = resolved.brand;
  const motto = brand.tagline || resolved.home?.eyebrow || "";
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      {/* soft brand-tinted backdrop so the gate feels designed, not bare */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ background: "radial-gradient(60% 55% at 50% 0%, var(--cs-color-brand-primary), transparent)" }}
      />
      <div className="relative w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
          {/* branded header band — mirrors the home-hub masthead */}
          <div
            className="relative px-6 pb-7 pt-8 text-center"
            style={{
              background:
                "linear-gradient(160deg, var(--cs-color-brand-primary), color-mix(in srgb, var(--cs-color-brand-primary) 55%, #000))",
              color: "var(--cs-color-on-primary)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, transparent 46%, rgba(255,255,255,.5) 47%, transparent 48%), linear-gradient(45deg, transparent 46%, rgba(255,255,255,.5) 47%, transparent 48%)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative">
              {brand.logo ? (
                <span className="mx-auto inline-flex rounded-xl bg-white px-3 py-2">
                  <img src={brand.logo} alt={brand.name} className="block h-9 w-auto" />
                </span>
              ) : (
                <div className="cs-display text-2xl" style={{ color: "var(--cs-color-on-primary)" }}>{brand.name}</div>
              )}
              {motto && (
                <p className="cs-eyebrow mt-3" style={{ color: "color-mix(in srgb, var(--cs-color-on-primary) 80%, transparent)" }}>
                  {motto}
                </p>
              )}
            </div>
          </div>

          {/* form body */}
          <form onSubmit={submit} className="space-y-4 p-6">
            <div>
              <h1 className="cs-display text-xl text-fg">{resolved.isHouse ? "Staff & partners" : "Welcome"}</h1>
              <p className="mt-0.5 text-sm text-fg-muted">
                Enter your passcode to open the {resolved.isHouse ? "console" : "portal"}.
              </p>
            </div>
            <label htmlFor="passcode" className="flex items-center gap-2 text-sm font-medium text-fg">
              <Lock className="h-4 w-4 text-brand-primary" /> Passcode
            </label>
            <Input
              id="passcode"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              autoComplete="off"
              placeholder="••••••••"
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={busy || !code}>
              {busy ? "Checking…" : "Enter portal"}
            </Button>
          </form>
        </div>
        <p className="cs-eyebrow mt-4 text-center text-fg-muted">Powered by CheeseShop TECH</p>
      </div>
    </div>
  );
}
