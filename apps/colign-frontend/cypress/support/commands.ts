/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Mint a real RS256 JWT via the vite-dev `/__dev__/mint` middleware and
       * seed the three localStorage keys that `authSlice.ts` reads on boot.
       * Only works when VITE_AUTH_MODE=mock and the backend is running on :8080.
       *
       * Usage: cy.loginAsMock("lead@example.com", "MANAGER");
       */
      loginAsMock(email: string, role?: "IC" | "MANAGER" | "ADMIN"): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginAsMock", (email: string, role: "IC" | "MANAGER" | "ADMIN" = "IC") => {
  cy.visit("/", { failOnStatusCode: false });
  cy.request({
    url: `/__dev__/mint?email=${encodeURIComponent(email)}&role=${role}`,
    failOnStatusCode: true,
  }).then((resp) => {
    cy.window().then((win) => {
      win.localStorage.setItem("colign_jwt", resp.body.token);
      win.localStorage.setItem("colign_email", resp.body.email ?? email);
      win.localStorage.setItem("colign_role", resp.body.role ?? role);
    });
    cy.reload();
  });
});

export {};
