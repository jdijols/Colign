import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import path from "node:path";
import { execSync } from "node:child_process";
import pkg from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");
  const isProd = mode === "production";

  return {
    plugins: [
      react(),
      federation({
        name: "colign",
        filename: "remoteEntry.js",
        manifest: true,
        exposes: {
          "./WeeklyCommitApp": "./src/WeeklyCommitApp.tsx",
        },
        shared: {
          react: { singleton: true, requiredVersion: pkg.dependencies.react },
          "react-dom": { singleton: true, requiredVersion: pkg.dependencies["react-dom"] },
          "react-router-dom": { singleton: true, requiredVersion: pkg.dependencies["react-router-dom"] },
          "@reduxjs/toolkit": { singleton: true, requiredVersion: pkg.dependencies["@reduxjs/toolkit"] },
          "react-redux": { singleton: true, requiredVersion: pkg.dependencies["react-redux"] },
        },
      }),
      // Dev-only middleware: mock-JWT minter, calls the Node script in scripts/
      // and pipes its stdout back as the bearer token. Disabled in production
      // builds — switch to @auth0/auth0-react redirect flow there.
      {
        name: "wc-dev-mint-jwt",
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
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      cors: true,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE ?? "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5174,
      strictPort: true,
      cors: true,
      headers: { "Access-Control-Allow-Origin": "*" },
    },
    base: isProd ? (process.env.PUBLIC_PATH ?? "/wc/") : "/",
    build: {
      target: "esnext",
      minify: "esbuild",
      cssCodeSplit: false,
      manifest: true,
      sourcemap: true,
      modulePreload: false,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].[hash].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash].[ext]",
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
