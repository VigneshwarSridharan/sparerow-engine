import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 4000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // Only emitted when uploading to Sentry (below) — the plugin strips them
    // from dist/ after upload, so without a token this stays off, same as before.
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // No-ops (and emits no auth warning) unless SENTRY_AUTH_TOKEN is set in the build env.
    process.env.SENTRY_AUTH_TOKEN &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
