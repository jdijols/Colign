import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:4173",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    // Pass through dev-only env vars so the responsive preflight can inspect them.
    env: {
      VITE_AUTH_MODE: process.env.VITE_AUTH_MODE ?? "real",
      VITE_API_BASE: process.env.VITE_API_BASE ?? "http://localhost:8080",
    },
  },
});
