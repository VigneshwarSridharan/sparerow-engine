import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
  });
}

const errorFallback = (
  <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem" }}>
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>Please refresh the page. We've been notified.</p>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={errorFallback}>
    <App />
  </Sentry.ErrorBoundary>
);
