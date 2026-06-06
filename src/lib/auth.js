// Auth layer over Netlify Identity (GoTrue). Netlify confirmed Identity is staying
// (Feb 2026 reversal). Roles + tenant live in the user's app_metadata (server-controlled,
// not user-editable) — see docs/AUTH_AND_ROLES.md.
import GoTrue from "gotrue-js";

// In production the Identity endpoint is served at <site>/.netlify/identity.
// VITE_GOTRUE_URL can override for testing against a deployed site from local dev.
const APIUrl =
  import.meta.env.VITE_GOTRUE_URL ||
  (typeof window !== "undefined" ? `${window.location.origin}/.netlify/identity` : "");

export const auth = new GoTrue({ APIUrl, audience: "", setCookie: true });

export const ROLES = ["admin", "client", "pr", "influencer", "creator"];

export function currentUser() {
  return auth.currentUser();
}

export async function login(email, password) {
  return auth.login(email, password, true); // remember = true
}

export async function logout() {
  const user = auth.currentUser();
  if (user) await user.logout();
}

/** Roles assigned to a user (Netlify Identity stores these in app_metadata.roles). */
export function rolesOf(user) {
  return user?.app_metadata?.roles || [];
}

/** The tenant a user belongs to (custom app_metadata.tenant; admins are tenant-agnostic). */
export function tenantOf(user) {
  return user?.app_metadata?.tenant || null;
}

export function hasRole(user, role) {
  return rolesOf(user).includes(role);
}

export function isAdmin(user) {
  return hasRole(user, "admin");
}

/**
 * Tenant-scope check (least privilege, DoD): a user may view a tenant portal only if
 * they belong to that tenant. Admins (CheeseShop TECH staff) may view any tenant.
 * The house/apex view requires admin.
 */
export function canAccessTenant(user, subdomain) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!subdomain) return false; // non-admins cannot use the house/apex view
  return tenantOf(user) === subdomain;
}
