import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// The lifecycle scenario assumes the H2 demo profile is up: Ada is seeded
// as an IC reporting to manager@st6.dev (see V3__seed_users.sql), and at
// least one RCDO Outcome exists (see V2__demo_seed.sql).

Given("I am signed in as IC {string}", (email: string) => {
  cy.loginAsMock(email, "IC");
});

When("I open the weekly plan", () => {
  cy.visit("/");
  cy.get('[data-cy="plan-heading"]', { timeout: 15000 }).should("be.visible");
});

Then(
  "the Submit plan button is disabled until at least one commit exists",
  () => {
    // The plan starts with zero commits → canSubmit=false → disabled Submit button.
    cy.contains("button", /^Submit plan$/).should("be.disabled");
  },
);

When("I add a commit titled {string}", (title: string) => {
  cy.get('[data-cy="add-commit"]').click();
  cy.get('[data-cy="commit-input"]').type(title);
  cy.get('[data-cy="commit-outcome-select"]').find("option").then(($opts) => {
    // First non-placeholder option = a real Outcome from the seed data.
    const realValue = $opts.toArray().map((o) => o.value).find((v) => v !== "");
    expect(realValue, "at least one Outcome must be seeded").to.be.ok;
    cy.get('[data-cy="commit-outcome-select"]').select(realValue as string);
  });
  cy.get('[data-cy="save-commit"]').click();
  cy.get('[data-cy="commit-list"]').contains(title).should("be.visible");
});

When("I submit the plan", () => {
  cy.get('[data-cy="submit-plan"]').click();
});

Then("the plan state shows {string}", (label: string) => {
  cy.get('[data-cy="plan-state"]', { timeout: 10000 }).contains(label).should("be.visible");
});

When("I start reconciliation", () => {
  // After submission, the WeeklyPlanPage shows "Start reconciliation" or
  // "Submit & start reconciling". Use the explicit goto-reconcile button if
  // present, otherwise navigate to the reconcile page directly and use
  // start-reconciliation there.
  cy.get("body").then(($body) => {
    if ($body.find('[data-cy="goto-reconcile"]').length) {
      cy.get('[data-cy="goto-reconcile"]').click();
    } else {
      cy.visit("/reconcile");
      cy.get('[data-cy="start-reconciliation"]').click();
    }
  });
});

When("I mark every commit as Done", () => {
  cy.get('[data-cy="reconcile-row"]').each(($row) => {
    cy.wrap($row).click();
    cy.wrap($row).contains("button", /^Done$/).click();
    cy.wrap($row).find('[data-cy="save-reconciliation"]').click();
    // Wait for "unreconciled" badge to flip to DONE before moving on.
    cy.wrap($row).contains(/DONE/i, { timeout: 10000 }).should("be.visible");
  });
});

When("I submit reconciliation", () => {
  cy.get('[data-cy="finalize-reconciliation"]').should("not.be.disabled").click();
});

When(
  "I sign in as manager {string} and open the team rollup",
  (email: string) => {
    cy.loginAsMock(email, "MANAGER");
    cy.visit("/manager");
  },
);

Then(
  "I see {string} on the team rollup with a high-priority alignment shown",
  (email: string) => {
    cy.contains('[data-cy="team-row"]', email, { timeout: 15000 }).within(() => {
      cy.contains(/%/).should("be.visible");
    });
  },
);
