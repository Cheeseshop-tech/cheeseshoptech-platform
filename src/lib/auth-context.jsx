import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { auth, currentUser, login as doLogin, logout as doLogout, identityAuthHeader } from "./auth.js";

const AuthContext = createContext(null);

// Dev-only bypass: Netlify Identity has no endpoint in local dev, so without this the
// portal would be unreachable on `npm run dev`. import.meta.env.DEV is false in any
// production build, so this can NEVER weaken the deployed site. Set
// VITE_DEV_BYPASS_AUTH=false to preview the real login screen locally.
const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH !== "false";
const DEV_USER = {
  email: "dev@cheeseshoptech.com",
  user_metadata: { full_name: "Dev Admin" },
  app_metadata: { roles: ["admin"], tenant: null },
  logout: async () => {},
};

// Pilot passcode mode (VITE_AUTH_MODE=passcode): shared passcodes unlock the portal instead
// of per-user Identity logins. Three tiers (ADMIN_DASHBOARDS_SPEC §2): client passcode →
// "client", per-tenant admin passcode → "client-admin" (Manage features), house passcode →
// "admin". On unlock we grant a synthetic session with that role; tenant comes from the URL.
const PASSCODE_MODE = import.meta.env.VITE_AUTH_MODE === "passcode";
const UNLOCK_KEY = "cs-portal-unlocked";
// The raw passcode itself, stashed ONLY so admin/client-admin write calls (media-update,
// media-delete, items-save) can replay it as the x-portal-passcode header — those Netlify
// functions now verify it server-side (2026-07-06; see netlify/functions/_write-guard.js).
// Never sent anywhere except our own function calls; never logged.
const PASSCODE_VALUE_KEY = "cs-portal-passcode";
const PASSCODE_ROLES = ["client", "client-admin", "admin"];
const passcodeUser = (role) => ({
  email: "portal@cheeseshoptech.com",
  user_metadata: { full_name: role === "client" ? "Portal" : role === "client-admin" ? "Portal Admin" : "CST Admin" },
  app_metadata: { roles: [role], tenant: null },
  logout: async () => {},
});
const unlockedRole = () => {
  try {
    const v = localStorage.getItem(UNLOCK_KEY);
    if (v === "1") return "client"; // legacy unlock value from before role tiers
    return PASSCODE_ROLES.includes(v) ? v : null;
  } catch { return null; }
};

function initialUser() {
  if (PASSCODE_MODE) {
    const role = unlockedRole();
    return role ? passcodeUser(role) : null;
  }
  return DEV_BYPASS ? DEV_USER : currentUser();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Recover the persisted session on mount (GoTrue rehydrates from local storage).
  useEffect(() => {
    if (!DEV_BYPASS && !PASSCODE_MODE) setUser(currentUser());
  }, []);

  // Grant the synthetic session after a correct passcode (PasscodeGate calls this).
  // role comes from the gate function's response; defaults to the base client tier.
  // `code` (the raw passcode the person typed) is stashed too — see PASSCODE_VALUE_KEY.
  const unlock = useCallback((role = "client", code = "") => {
    const r = PASSCODE_ROLES.includes(role) ? role : "client";
    try {
      localStorage.setItem(UNLOCK_KEY, r);
      if (code) localStorage.setItem(PASSCODE_VALUE_KEY, code);
    } catch { /* quota / private mode */ }
    setUser(passcodeUser(r));
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const u = await doLogin(email, password);
      setUser(u);
      return u;
    } catch (err) {
      const msg = err?.json?.error_description || err?.message || "Login failed.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (PASSCODE_MODE) {
      try { localStorage.removeItem(UNLOCK_KEY); localStorage.removeItem(PASSCODE_VALUE_KEY); } catch { /* ignore */ }
      setUser(null);
      return;
    }
    await doLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, unlock, passcodeMode: PASSCODE_MODE, gotrue: auth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/**
 * The passcode to replay as the `x-portal-passcode` header on admin/client-admin write calls
 * (media-update, media-delete, items-save — see netlify/functions/_write-guard.js). "" outside
 * passcode mode or before unlock; those calls will then correctly 401.
 */
export function writeAuthHeader() {
  if (!PASSCODE_MODE) return {};
  try {
    const code = localStorage.getItem(PASSCODE_VALUE_KEY);
    return code ? { "x-portal-passcode": code } : {};
  } catch { return {}; }
}

/**
 * Combined credential for Netlify Function calls (2026-08-17 fix — AUTH_AND_ROLES.md).
 * The portal now signs users in for real via Netlify Identity, but every write/read function
 * still only checked the old passcode header, so a logged-in session sent no credential the
 * server recognized and every call 401'd. This sends whichever this session actually holds:
 * the stashed passcode (harmless no-op outside passcode mode) AND the Identity bearer token
 * (identityAuthHeader() — resolves {} when signed out). Async because the Identity token may
 * need a refresh; every call site awaits this instead of writeAuthHeader() directly.
 */
export async function authHeaders() {
  return { ...writeAuthHeader(), ...(await identityAuthHeader()) };
}
