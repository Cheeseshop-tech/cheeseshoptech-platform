import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { useAuth } from "@/lib/auth-context.jsx";

// Login screen. Renders in the resolved brand (house by default; a tenant subdomain skins it
// via tokens). Co-brand note: the "powered by" mark stays on tenant logins (DESIGN_SYSTEM B0).
export function LoginScreen({ brand, isHouse = true }) {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      /* error surfaced via context */
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
          <p className="mt-2 text-sm text-fg-muted">Sign in to your portal</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-base bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!isHouse && (
          <p className="mt-6 text-center text-xs text-fg-muted">Powered by CheeseShop TECH</p>
        )}
      </div>
    </div>
  );
}
