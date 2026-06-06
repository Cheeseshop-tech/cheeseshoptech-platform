import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context.jsx";
import { canAccessTenant, rolesOf, tenantOf } from "@/lib/auth.js";
import { LoginScreen } from "./login-screen.jsx";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";

// Auth + tenant-scope gate (Phase 3 DoD: no cross-tenant visibility).
// - Not signed in        -> house/tenant-branded login screen
// - Signed in, wrong tenant -> access denied (least privilege)
// - Signed in, allowed    -> render the portal
export function RequireAuth({ resolved, children }) {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginScreen brand={resolved.brand} isHouse={resolved.isHouse} />;
  }

  if (!canAccessTenant(user, resolved.subdomain)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md">
          <EmptyState
            icon={ShieldAlert}
            title="No access to this portal"
            description={
              `You're signed in as ${user.email}` +
              (tenantOf(user) ? ` (tenant: ${tenantOf(user)})` : "") +
              `, which doesn't have access to ${resolved.brand.name}.`
            }
            action={
              <Button variant="outline" size="sm" onClick={logout}>
                Sign out
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return children;
}

// Conditionally render UI by role. Usage: <RoleGate roles={["client","admin"]}>…</RoleGate>
export function RoleGate({ roles = [], children, fallback = null }) {
  const { user } = useAuth();
  const userRoles = rolesOf(user);
  const ok = roles.length === 0 || roles.some((r) => userRoles.includes(r));
  return ok ? children : fallback;
}
