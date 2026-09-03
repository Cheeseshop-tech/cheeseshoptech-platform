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

  // Proactive session-health check (cst-hardening-plan.md Part A item 4, 2026-09-03).
  // GoTrue's local session can look signed-in (a cached user object, a JWT that hasn't hit its
  // own expiry yet) even after the session has actually died server-side — token revoked, user
  // deleted, refresh token expired. Until now the app only discovered that the same way CRM-05
  // did: a real read/write 401s mid-render and the failure surfaces as a broken tab, not as
  // "you're signed out." This verifies the session is still real on mount and whenever the tab
  // regains focus (the moment someone's most likely to come back to a stale session) — before
  // any data fetch depends on it — and drops back to signed-out (the existing LoginScreen gate
  // in require-auth.jsx) the instant it isn't. Dev bypass and passcode mode have no real Identity
  // session to verify, so this is a no-op there.
  useEffect(() => {
    if (DEV_BYPASS || PASSCODE_MODE) return;
    let cancelled = false;

    const verifySession = async () => {
      const u = auth.currentUser();
      if (!u) {
        if (!cancelled) setUser(null);
        return;
      }
      try {
        await u.jwt(); // no-op if the token's far from expiry; refreshes (or throws) otherwise
      } catch {
        if (!cancelled) setUser(null);
      }
    };

    verifySession();
    window.addEventListener("focus", verifySession);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", verifySession);
    };
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
      recordLogin(); // fire-and-forget — see below; never blocks or fails the actual sign-in
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

/**
 * Record a real Identity sign-in to the house Access log (2026-08-21, Rick: "show names of who
 * is logging in" — netlify/functions/record-login.js). Fire-and-forget from login() above: the
 * server re-derives who this is from the verified Identity JWT itself, so nothing sent from here
 * is trusted — this call carries no body, just the auth header. Never awaited by the caller and
 * every failure is swallowed, matching the "logging never blocks or breaks the real action"
 * contract the rest of this app's audit logging already follows (_write-log.js, _login-log.js).
 * Not called in passcode mode (no per-user identity to attribute) or the dev bypass (not a real
 * login) — only from an actual Identity login() success.
 */
function recordLogin() {
  authHeaders()
    .then((headers) => fetch("/.netlify/functions/record-login", { method: "POST", headers }))
    .catch(() => { /* best-effort — see doc comment */ });
}
