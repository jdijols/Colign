const DENSE_SELECTORS = [
  "th button",
  '[aria-label*="agination" i] button',
  '[data-testid*="pagination"] button',
  '[data-dense-control="true"]',
];

// SPEC §6.6 — ALLOWLIST. Only permit localhost/127/LAN IPs. Reject everything else
// including staging.*, *.fly.dev, *.vercel.app, and api.colign.org.
const DEV_API_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+(?::\d+)?)(\/.*)?$/i;

export function preflight(): void {
  const authMode = Cypress.env("VITE_AUTH_MODE") || "";
  if (authMode !== "mock") {
    throw new Error(
      `Responsive specs require VITE_AUTH_MODE=mock (got "${authMode}"). Aborting before navigation.`
    );
  }
  const apiBase = Cypress.env("VITE_API_BASE") || "";
  if (!DEV_API_PATTERN.test(apiBase)) {
    throw new Error(
      `Responsive specs MUST target a local dev backend (allowlist failed; got "${apiBase}"). Aborting.`
    );
  }
}

export function assertNoHorizontalScroll(): void {
  cy.window().then((win) => {
    const root = (win.document.querySelector("#colign-root") ?? win.document.documentElement) as Element;
    expect(root.scrollWidth, "no horizontal scroll inside #colign-root").to.be.at.most(root.clientWidth + 1);
  });
}

export function assertTouchTargets(): void {
  cy.window().then((win) => {
    const root = win.document.querySelector("#colign-root") ?? win.document.documentElement;
    const candidates = root.querySelectorAll(
      'a, button, input, select, [role="button"], tr[data-clickable="true"], [data-clickable="true"]'
    );
    const exceptionMatches = (el: Element): boolean =>
      DENSE_SELECTORS.some((sel) => el.matches(sel) || el.closest(sel) !== null);
    const failures: string[] = [];
    candidates.forEach((el) => {
      if (exceptionMatches(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        failures.push(`${el.tagName}#${el.id || "(no-id)"} ${Math.round(rect.width)}×${Math.round(rect.height)}`);
      }
    });
    expect(failures, `all primary interactive elements ≥ 44×44 (failures: ${failures.join(", ")})`).to.be.empty;
  });
}
