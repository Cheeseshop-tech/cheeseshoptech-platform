import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./lib/auth-context.jsx";
import { ToastProvider } from "./components/ui/toast.jsx";
import { resolveClient } from "./lib/clientConfig.js";
import { applyTheme } from "./lib/theme.js";
import "./index.css";

// Resolve the tenant and paint the theme before first render.
const resolved = resolveClient();
applyTheme(resolved);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App initialResolved={resolved} />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
);
