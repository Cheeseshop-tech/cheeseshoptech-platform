import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { acceptInvite, completeRecovery, confirmSignup, clearHashToken } from "@/lib/auth.js";

// Handles Netlify Identity hash-token flows for the custom login:
//   invite  -> set a password to activate the account
//   recovery-> set a new password
//   confirmation -> confirm signup, then proceed to login
const COPY = {
  invite: { title: "Set your password", cta: "Activate account", needsPassword: true },
  recovery: { title: "Choose a new password", cta: "Update password", needsPassword: true },
  confirmation: { title: "Confirming your account…", cta: "Continue", needsPassword: false },
};

export function SetPassword({ brand, type, token, onDone }) {
  const cfg = COPY[type] || COPY.invite;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // Confirmation has no form — process immediately.
  useEffect(() => {
    if (type === "confirmation") {
      (async () => {
        setLoading(true);
        try {
          await confirmSignup(token);
          setDone(true);
        } catch (e) {
          setError(e?.json?.error_description || e?.message || "Confirmation failed.");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [type, token]);

  async function onSubmit(e) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    setError(null);
    try {
      if (type === "invite") await acceptInvite(token, password);
      else if (type === "recovery") await completeRecovery(token, password);
      clearHashToken();
      setDone(true);
      onDone?.();
    } catch (e) {
      setError(e?.json?.error_description || e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {brand?.logo ? (
            <img src={brand.logo} alt={brand?.name || "Logo"} className="mx-auto h-9 w-auto" />
          ) : (
            <span className="font-heading text-2xl text-brand-primary">{brand?.name}</span>
          )}
          <p className="mt-2 text-sm text-fg-muted">{cfg.title}</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {done ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-fg">
                  {type === "recovery" ? "Password updated." : "Account activated."} You're signed in.
                </p>
                <Button variant="primary" className="w-full" onClick={() => { clearHashToken(); window.location.href = "/?app=1"; }}>
                  Go to portal
                </Button>
              </div>
            ) : cfg.needsPassword ? (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="pw">New password</Label>
                  <Input id="pw" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pw2">Confirm password</Label>
                  <Input id="pw2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
                </div>
                {error && <p role="alert" className="rounded-base bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                  {loading ? "Working…" : cfg.cta}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                {error ? (
                  <p role="alert" className="text-sm text-error">{error}</p>
                ) : (
                  <p className="text-sm text-fg-muted">{loading ? "Confirming…" : "Done."}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {!brand?.isHouse && <p className="mt-6 text-center text-xs text-fg-muted">Powered by CheeseShop TECH</p>}
      </div>
    </div>
  );
}
