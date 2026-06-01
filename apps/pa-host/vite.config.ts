import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { execSync } from "node:child_process";
import path from "node:path";
import pkg from "./package.json" with { type: "json" };

// `||` (not `??`) so an EMPTY-STRING env var still falls back.
// `vercel env pull` masks sensitive prod values as "" — without this guard
// the build would compile the remote entry as "" and the federation runtime
// would resolve every chunk against the host origin (404 → SPA index.html →
// MIME error → blank page).
const COLIGN_REMOTE_URL =
  process.env.COLIGN_REMOTE_URL || "http://localhost:5174/remoteEntry.js";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "pa_host",
      remotes: {
        colign: {
          type: "module",
          name: "colign",
          entry: COLIGN_REMOTE_URL,
          entryGlobalName: "colign",
          shareScope: "default",
        },
      },
      shared: {
        react: { singleton: true, requiredVersion: pkg.dependencies.react },
        "react-dom": { singleton: true, requiredVersion: pkg.dependencies["react-dom"] },
        "react-router-dom": {
          singleton: true,
          requiredVersion: pkg.dependencies["react-router-dom"],
        },
        "@reduxjs/toolkit": {
          singleton: true,
          requiredVersion: pkg.dependencies["@reduxjs/toolkit"],
        },
        "react-redux": { singleton: true, requiredVersion: pkg.dependencies["react-redux"] },
        // MUST be a singleton: @auth0/auth0-react provides React CONTEXT. This
        // host creates the Auth0Provider; the remote's useAuth0() reads it. If
        // the remote loads its own copy, its context is never initialized →
        // isLoading stuck true → infinite "Signing you in…". Same as react-router.
        "@auth0/auth0-react": {
          singleton: true,
          requiredVersion: pkg.dependencies["@auth0/auth0-react"],
        },
      },
    }),
    // Mirror the wc-frontend dev-mint middleware so the WC remote's LoginPage
    // can fetch("/__dev__/mint") even when running inside the host origin.
    {
      name: "pa-host-dev-mint-jwt",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/__dev__/mint", (req, res) => {
          try {
            const url = new URL(req.url ?? "", "http://localhost");
            const email = url.searchParams.get("email") ?? "ada@st6.dev";
            const role = url.searchParams.get("role") ?? "IC";
            const ttl = url.searchParams.get("ttl") ?? "14400";
            const audience = url.searchParams.get("audience") ?? "https://api.colign.org";
            const scriptPath = path.resolve(__dirname, "../../scripts/mock-jwt.mjs");
            const token = execSync(
              `node "${scriptPath}" --email "${email}" --role "${role}" --ttl ${ttl} --audience "${audience}"`,
              { encoding: "utf8" }
            ).trim();
            res.statusCode = 200;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ token, email, role }));
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: msg }));
          }
        });
      },
    },
  ],
  server: {
    port: 4173,
    strictPort: true,
    cors: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: { port: 4173, strictPort: true },
  build: { target: "esnext", minify: "esbuild", manifest: true },
});
