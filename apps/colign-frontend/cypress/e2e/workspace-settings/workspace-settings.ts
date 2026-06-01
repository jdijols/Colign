import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("I am signed in as a team lead", () => {
  cy.loginAsMock("lead@example.com");
  cy.visit("/");
});

When("I open the workspace settings from the account menu", () => {
  cy.get('[data-cy="sidebar-user-chip"]').click();
  cy.get('[data-cy="sidebar-settings"]').click();
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

Then("I should see the Members section", () => {
  cy.contains("h2", "Members").should("be.visible");
});

Then("the Members list contains {string}", (email: string) => {
  cy.contains(email).should("be.visible");
});

When("I change the team name to {string}", (name: string) => {
  cy.get('[data-cy="team-name-input"]').clear().type(name);
});

When("I save the team settings", () => {
  cy.get('[data-cy="team-save"]').click();
});

Then("I should see a saved confirmation", () => {
  cy.contains(/saved/i).should("be.visible");
});

Then("reloading the page keeps the team name as {string}", (name: string) => {
  cy.reload();
  cy.get('[data-cy="team-name-input"]').should("have.value", name);
});

When("I click Remove on the member with email {string}", (email: string) => {
  cy.contains("li", email).within(() => {
    cy.contains("button", /remove/i).click();
  });
});

When("I confirm the removal", () => {
  cy.get('[data-cy="confirm-dialog-confirm"]').click();
});

Then("the Members list no longer contains {string}", (email: string) => {
  cy.contains(email).should("not.exist");
});

When("I set the team avatar URL to {string}", (url: string) => {
  cy.get('[data-cy="team-avatar-input"]').clear().type(url);
});

Then("the AppShell header shows the team name", () => {
  cy.get("header").contains(/acme|renamed/i).should("be.visible");
});
