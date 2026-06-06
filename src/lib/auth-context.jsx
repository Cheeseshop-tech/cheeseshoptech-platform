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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (DEV_BYPASS ? DEV_USER : currentUser()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Recover the persisted session on mount (GoTrue rehydrates from local storage).
  useEffect(() => {
    if (!DEV_BYPASS) setUser(currentUser());
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
    await doLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, gotrue: auth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
