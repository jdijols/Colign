# Cypress + Cucumber/Gherkin BDD on Vite 5 + React 18

> **Sourcing note.** Live web (WebSearch / WebFetch / ctx7) was denied in the
> subagent environment. Version pins below reflect the most recent confirmed
> releases through Claude Opus 4.7's training cutoff (Jan 2026); run
> `npm view <pkg> version` against each package before locking the
> `package.json`. The single biggest risk is the badeball-21.x ↔ Cypress-14
> pairing — confirm `peerDependencies` before installing.

## Versions (pinned for late 2025 / early 2026)

| Package | Version | Why |
| --- | --- | --- |
| `cypress` | `^14.5.0` | Cypress 14 is current GA line (released Jan 2025); stable on Node 20/22, supports Vite dev server natively. |
| `@badeball/cypress-cucumber-preprocessor` | `^21.0.3` | Current stable line; bumped peer to Cypress 14, drops Node 18 in favor of Node 20+. |
| `@bahmutov/cypress-esbuild-preprocessor` | `^2.2.3` | Latest 2.x; pairs with esbuild 0.24+. Recommended over the webpack preprocessor for Vite projects (no webpack config to maintain). |
| `esbuild` | `^0.24.2` | Peer of the esbuild preprocessor; matches what Vite 5 ships. |
| `cypress-mochawesome-reporter` | `^3.8.4` | Best current Cypress HTML reporter; merges multi-spec runs automatically. |
| `mocha-junit-reporter` | `^2.2.1` | JUnit XML output that GitHub Actions / Jenkins / GitLab can ingest next to JaCoCo. |
| `cypress-multi-reporters` | `^2.0.5` | Lets one run emit both Mochawesome (humans) and JUnit (CI). |
| `@testing-library/cypress` | `^10.0.3` | Gives `cy.findByRole` and other accessible queries. |
| `typescript` | `^5.6.3` | Required by Cypress 14 typings. |

Fallback combo if badeball 21.x is not yet on npm in your install window: `@badeball/cypress-cucumber-preprocessor@^20.1.0` + `cypress@^13.15.0`. Everything else in this guide is identical.

## File set — full contents

### `cypress.config.ts`
```ts
import { defineConfig } from "cypress";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";

async function setupNodeEvents(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<Cypress.PluginConfigOptions> {
  await addCucumberPreprocessorPlugin(on, config);

  on(
    "file:preprocessor",
    createBundler({
      plugins: [createEsbuildPlugin(config)],
    })
  );

  return config;
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5174",
    specPattern: "cypress/e2e/**/*.feature",
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents,
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    reporter: "cypress-multi-reporters",
    reporterOptions: {
      reporterEnabled: "cypress-mochawesome-reporter, mocha-junit-reporter",
      cypressMochawesomeReporterReporterOptions: {
        reportDir: "cypress/reports/mochawesome",
        embeddedScreenshots: true,
        inlineAssets: true,
      },
      mochaJunitReporterReporterOptions: {
        mochaFile: "cypress/reports/junit/results-[hash].xml",
        toConsole: false,
      },
    },
  },
});
```

### `.cypress-cucumber-preprocessorrc.json`
```json
{
  "stepDefinitions": [
    "cypress/support/step_definitions/**/*.{ts,js}",
    "cypress/e2e/[filepath]/**/*.{ts,js}",
    "cypress/e2e/[filepath].{ts,js}"
  ],
  "filterSpecs": true,
  "omitFiltered": true,
  "json": {
    "enabled": true,
    "output": "cypress/reports/cucumber-json/messages.json"
  },
  "messages": {
    "enabled": true,
    "output": "cypress/reports/cucumber-messages.ndjson"
  }
}
```

### `tsconfig.cypress.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "isolatedModules": false,
    "types": ["cypress", "node", "@testing-library/cypress"],
    "lib": ["ES2022", "DOM"],
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["cypress/**/*.ts", "cypress.config.ts"],
  "exclude": ["node_modules", "src", "dist"]
}
```

Add `"references": [{ "path": "./tsconfig.cypress.json" }]` to your root `tsconfig.json` and exclude `cypress/**` from the app tsconfig — this is the fix for the Vitest `expect` vs Cypress `expect` type collision.

### `cypress/support/e2e.ts`
```ts
import "@testing-library/cypress/add-commands";
import "cypress-mochawesome-reporter/register";

Cypress.on("uncaught:exception", (err) => {
  if (err.message.includes("ResizeObserver loop")) return false;
  return true;
});
```

### `cypress/e2e/weekly-commit.feature`
```gherkin
Feature: Weekly Commit Lifecycle
  As an IC I draft a weekly plan, lock it, and reconcile it
  so my manager can see what I committed to and what I delivered.

  Background:
    Given I am logged in as IC "ada@st6.dev"
    And the API has no existing plan for the current week

  @smoke
  Scenario: IC drafts, locks, and reconciles a weekly plan with three commits
    Given I am on the Weekly Plan page
    When I add a commit "Ship onboarding redesign"
    And I add a commit "Reduce auth p95 to 200ms"
    And I add a commit "Pair with Sam on billing migration"
    Then the plan should be in state "DRAFT"
    And the lock button should be enabled

    When I click "Lock plan"
    Then the plan should be in state "LOCKED"
    And the manager dashboard for "ada@st6.dev" should show 1 locked plan

    When I open the reconciliation view
    And I mark "Ship onboarding redesign" as "done"
    And I mark "Reduce auth p95 to 200ms" as "partial"
    And I mark "Pair with Sam on billing migration" as "dropped"
    And I click "Submit reconciliation"
    Then the plan should be in state "RECONCILED"
    And I should see a toast "Week reconciled"
```

### `cypress/support/step_definitions/weekly-commit.steps.ts`
```ts
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("I am logged in as IC {string}", (email: string) => {
  cy.intercept("POST", "/api/auth/session", {
    statusCode: 200,
    body: { user: { email, role: "IC" } },
  }).as("session");
  cy.setCookie("st6_session", "test-token");
  cy.wrap(email).as("currentUser");
});

Given("the API has no existing plan for the current week", () => {
  cy.intercept("GET", "/api/plans/current", { statusCode: 404, body: {} }).as("noPlan");
  cy.wrap({ state: "DRAFT", commits: [] as Array<{ title: string; outcome?: string }> })
    .as("plan");
});

Given("I am on the Weekly Plan page", () => {
  cy.intercept("POST", "/api/plans", (req) => {
    req.reply({ statusCode: 201, body: { id: "plan-1", ...req.body, state: "DRAFT" } });
  }).as("createPlan");
  cy.visit("/plan/current");
  cy.findByRole("heading", { name: /weekly plan/i }).should("be.visible");
});

When("I add a commit {string}", (title: string) => {
  cy.get<{ commits: Array<{ title: string }> }>("@plan").then((plan) => {
    plan.commits.push({ title });
    cy.wrap(plan).as("plan");
  });
  cy.findByRole("button", { name: /add commit/i }).click();
  cy.get("[data-cy=commit-input]").last().type(title);
  cy.findByRole("button", { name: /save commit/i }).click();
});

Then("the plan should be in state {string}", (state: string) => {
  cy.get("[data-cy=plan-state]").should("have.text", state);
});

Then("the lock button should be enabled", () => {
  cy.findByRole("button", { name: /lock plan/i }).should("be.enabled");
});

When("I click {string}", (label: string) => {
  cy.intercept("PATCH", "/api/plans/plan-1/lock", { statusCode: 200, body: { state: "LOCKED" } })
    .as("lock");
  cy.intercept("PATCH", "/api/plans/plan-1/reconcile", { statusCode: 200, body: { state: "RECONCILED" } })
    .as("reconcile");
  cy.findByRole("button", { name: new RegExp(label, "i") }).click();
});

Then(
  "the manager dashboard for {string} should show {int} locked plan(s)",
  (email: string, count: number) => {
    cy.intercept("GET", `/api/manager/reports?ic=${encodeURIComponent(email)}`, {
      statusCode: 200,
      body: { locked: count, plans: [{ id: "plan-1", state: "LOCKED" }] },
    }).as("managerView");
    cy.visit("/manager");
    cy.wait("@managerView");
    cy.findByRole("row", { name: new RegExp(email) }).within(() => {
      cy.findByText(new RegExp(`${count}\\s+locked`, "i")).should("exist");
    });
  }
);

When("I open the reconciliation view", () => {
  cy.visit("/plan/plan-1/reconcile");
});

When("I mark {string} as {string}", (title: string, outcome: "done" | "partial" | "dropped") => {
  cy.findByRole("row", { name: new RegExp(title, "i") }).within(() => {
    cy.findByRole("radio", { name: new RegExp(outcome, "i") }).check();
  });
});

Then("I should see a toast {string}", (msg: string) => {
  cy.findByRole("status").should("contain.text", msg);
});
```

### `package.json` (relevant fragments)
```json
{
  "scripts": {
    "dev": "vite",
    "cy:open": "cypress open --e2e --browser chrome",
    "cy:run": "cypress run --browser chrome --e2e",
    "cy:ci": "start-server-and-test 'vite preview --port 5174' http://localhost:5174 'cypress run --browser chrome --e2e'",
    "cy:smoke": "cypress run --env tags='@smoke'",
    "cy:report": "mochawesome-merge cypress/reports/mochawesome/*.json > cypress/reports/merged.json && marge cypress/reports/merged.json -o cypress/reports/html"
  },
  "devDependencies": {
    "cypress": "^14.5.0",
    "@badeball/cypress-cucumber-preprocessor": "^21.0.3",
    "@bahmutov/cypress-esbuild-preprocessor": "^2.2.3",
    "@testing-library/cypress": "^10.0.3",
    "cypress-mochawesome-reporter": "^3.8.4",
    "cypress-multi-reporters": "^2.0.5",
    "mocha-junit-reporter": "^2.2.1",
    "mochawesome": "^7.1.3",
    "mochawesome-merge": "^4.4.1",
    "mochawesome-report-generator": "^6.2.0",
    "esbuild": "^0.24.2",
    "start-server-and-test": "^2.0.10",
    "typescript": "^5.6.3"
  }
}
```

## CI command + reporter

The one-liner for headless CI is `npm run cy:ci` — it boots Vite preview on 5174, waits for HTTP 200, then runs `cypress run --browser chrome --e2e`. The `cypress-multi-reporters` setup emits **both** a Mochawesome HTML report (great for PR artifact links) and `mocha-junit-reporter` XML files into `cypress/reports/junit/`. In GitHub Actions / Jenkins, point the JUnit step at `cypress/reports/junit/*.xml` and your existing JaCoCo step at `target/site/jacoco/jacoco.xml`; most aggregators (Datadog Test Visibility, Allure, BuildPulse) ingest both formats side-by-side.

## Top 5 pitfalls

- **Type collisions between Vitest and Cypress** — symptom: `expect` shows wrong overloads, `it()` flagged as duplicate. Fix: separate `tsconfig.cypress.json` with `types: ["cypress"]` (not `vitest`) and exclude `cypress/**` in the app tsconfig.
- **esbuild vs webpack preprocessor** — webpack preprocessor requires a parallel webpack config you don't already have on Vite projects, doubling maintenance. Use `@bahmutov/cypress-esbuild-preprocessor`. Symptom of mis-pick: 30-second cold compiles on every spec.
- **`cypress open` not picking up new `.feature` files** — Fix: `filterSpecs: true` plus `omitFiltered: true` in `.cypress-cucumber-preprocessorrc.json`, and restart the Cypress GUI (it caches spec discovery; HMR does not apply to feature files).
- **`Given` collisions across step files** — Fix: scope steps with `cypress/e2e/[filepath]/**` glob in the rc file so each `.feature` looks first in a sibling folder; use specific phrases ("I am logged in as IC") instead of generic ones.
- **`tags: '@smoke'` filter syntax** — Fix: pass `--env tags='@smoke'` (quoted); combine with `and`/`or`/`not`: `--env tags='@smoke and not @flaky'`. Also requires `filterSpecs: true` in the rc.

## Sources

- [@badeball/cypress-cucumber-preprocessor — npm](https://www.npmjs.com/package/@badeball/cypress-cucumber-preprocessor)
- [badeball/cypress-cucumber-preprocessor — GitHub](https://github.com/badeball/cypress-cucumber-preprocessor)
- [Cypress changelog](https://docs.cypress.io/guides/references/changelog)
- [@bahmutov/cypress-esbuild-preprocessor — GitHub](https://github.com/bahmutov/cypress-esbuild-preprocessor)
- [cypress-mochawesome-reporter — GitHub](https://github.com/LironEr/cypress-mochawesome-reporter)
- [cypress-multi-reporters — GitHub](https://github.com/YouAreMyEverything/cypress-multi-reporters)
- [mocha-junit-reporter — npm](https://www.npmjs.com/package/mocha-junit-reporter)
- [@testing-library/cypress — docs](https://testing-library.com/docs/cypress-testing-library/intro/)
- [Cucumber tag expressions reference](https://cucumber.io/docs/cucumber/api/?lang=javascript#tag-expressions)
- [start-server-and-test — GitHub](https://github.com/bahmutov/start-server-and-test)
