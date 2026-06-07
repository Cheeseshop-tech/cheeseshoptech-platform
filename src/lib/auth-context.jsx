import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { auth, currentUser, login as doLogin, logout as doLogout } from "./auth.js";

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

// Pilot passcode mode (VITE_AUTH_MODE=passcode): a single shared passcode unlocks the portal
// instead of per-user Identity logins. On unlock we grant a synthetic "client" session so the
// rest of the app (nav, role-gated UI) works; the tenant comes from the URL. See PasscodeGate.
const PASSCODE_MODE = import.meta.env.VITE_AUTH_MODE === "passcode";
const UNLOCK_KEY = "cs-portal-unlocked";
const PASSCODE_USER = {
  email: "portal@cheeseshoptech.com",
  user_metadata: { full_name: "Portal" },
  app_metadata: { roles: ["client"], tenant: null },
  logout: async () => {},
};
const isUnlocked = () => {
  try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; }
};

function initialUser() {
  if (PASSCODE_MODE) return isUnlocked() ? PASSCODE_USER : null;
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
  const unlock = useCallback(() => {
    try { localStorage.setItem(UNLOCK_KEY, "1"); } catch { /* quota / private mode */ }
    setUser(PASSCODE_USER);
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
      try { localStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ }
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
