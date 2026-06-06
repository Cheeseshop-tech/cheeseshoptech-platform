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

/**
 * Netlify Identity invite/recovery/confirmation links arrive as a URL hash token
 * (e.g. #invite_token=…). Parse it so the app can complete the flow (our custom login,
 * unlike the Netlify widget, must handle this itself).
 */
export function getHashToken() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  for (const type of ["invite_token", "recovery_token", "confirmation_token"]) {
    const token = params.get(type);
    if (token) return { type: type.replace("_token", ""), token };
  }
  return null;
}

export function clearHashToken() {
  if (typeof window !== "undefined") {
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }
}

/** Accept an invite and set the password (logs the user in). */
export async function acceptInvite(token, password) {
  return auth.acceptInvite(token, password, true);
}

/** Confirm a signup confirmation token. */
export async function confirmSignup(token) {
  return auth.confirm(token, true);
}

/** Complete a password recovery: recover with the token, then set the new password. */
export async function completeRecovery(token, password) {
  const user = await auth.recover(token, true);
  return user.update({ password });
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

/**
 * The tenant a user belongs to. Two sources (admins are tenant-agnostic):
 *  1) `app_metadata.tenant` if set (e.g. via the GoTrue admin API), OR
 *  2) a `tenant:<id>` role — because the Netlify Identity dashboard only lets you edit ROLES,
 *     not arbitrary metadata, so this is how a tenant is assigned in the UI.
 */
export function tenantOf(user) {
  const explicit = user?.app_metadata?.tenant;
  if (explicit) return explicit;
  const r = rolesOf(user).find((x) => x.startsWith("tenant:"));
  return r ? r.slice("tenant:".length) : null;
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
