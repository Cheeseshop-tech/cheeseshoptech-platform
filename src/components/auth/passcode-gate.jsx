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

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {resolved.brand.logo ? (
            <img src={resolved.brand.logo} alt={resolved.brand.name} className="mx-auto h-10 w-auto" />
          ) : (
            <div className="cs-display text-3xl text-brand-primary">{resolved.brand.name}</div>
          )}
          <p className="cs-eyebrow mt-2 text-fg-muted">{resolved.isHouse ? "Staff & partners" : "Private portal"}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <label htmlFor="passcode" className="flex items-center gap-2 text-sm font-medium text-fg">
            <Lock className="h-4 w-4 text-brand-primary" /> Enter passcode
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
        <p className="cs-eyebrow mt-4 text-center text-fg-muted">Powered by CheeseShop TECH</p>
      </div>
    </div>
  );
}
