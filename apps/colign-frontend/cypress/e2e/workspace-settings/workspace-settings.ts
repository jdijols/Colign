import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("I am signed in as a team lead", () => {
  cy.loginAsMock("lead@example.com");
  cy.visit("/");
});

When("I open the workspace settings from the user menu", () => {
  cy.get('[data-cy="user-menu-trigger"]').click();
  cy.get('[data-cy="user-menu-settings"]').click();
  cy.location("pathname").should("include", "/settings");
});

Then("I should see the Invitations section", () => {
  cy.contains("h2", "Invitations").should("be.visible");
});

When("I type {string} into the invite email field", (email: string) => {
  cy.get('[data-cy="invite-email-input"]').type(email);
});

When("I submit the invite", () => {
  cy.get('[data-cy="send-invite-submit"]').click();
});

Then("I should see an invitation sent confirmation", () => {
  cy.contains(/invitation sent/i).should("be.visible");
});
