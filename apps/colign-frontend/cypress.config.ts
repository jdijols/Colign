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
    // cypress-multi-reporters bridges to both a human-friendly mochawesome
    // HTML report and a machine-readable junit XML for CI ingest. Outputs
    // land under cypress-results/ (gitignored).
    reporter: "cypress-multi-reporters",
    reporterOptions: {
      reporterEnabled: "mochawesome, mocha-junit-reporter",
      mochawesomeReporterOptions: {
        reportDir: "cypress-results/mochawesome",
        overwrite: true,
        html: true,
        json: true,
      },
      mochaJunitReporterReporterOptions: {
        mochaFile: "cypress-results/junit/[hash].xml",
        toConsole: false,
      },
    },
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
