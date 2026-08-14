import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./lib/auth-context.jsx";
import { ToastProvider } from "./components/ui/toast.jsx";
import { ErrorBoundary } from "./components/error-boundary.jsx";
import { resolveClient } from "./lib/clientConfig.js";
import { applyTheme } from "./lib/theme.js";
import { initMonitoring } from "./lib/monitoring.js";
import "./index.css";

// Fire-and-forget: env-gated on VITE_SENTRY_DSN, dynamically imports the SDK, never blocks
// first paint. See lib/monitoring.js.
initMonitoring();

// Resolve the tenant and paint the theme before first render.
const resolved = resolveClient();
applyTheme(resolved);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <App initialResolved={resolved} />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
