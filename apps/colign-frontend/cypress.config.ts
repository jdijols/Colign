import { defineConfig } from "cypress";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:4173",
    specPattern: [
      "cypress/e2e/**/*.cy.{ts,tsx}",
      "cypress/e2e/**/*.feature",
    ],
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    // Pass through dev-only env vars so the responsive preflight can inspect them.
    env: {
      VITE_AUTH_MODE: process.env.VITE_AUTH_MODE ?? "real",
      VITE_API_BASE: process.env.VITE_API_BASE ?? "http://localhost:8080",
    },
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on(
        "file:preprocessor",
        createBundler({ plugins: [createEsbuildPlugin(config)] }),
      );
      return config;
    },
  },
});
