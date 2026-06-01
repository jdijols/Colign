import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/render";
import { SidebarShell, type SidebarMe } from "./SidebarShell";

const managerMe: SidebarMe = {
  teamName: "Acme Engineering",
  teamAvatarUrl: null,
  displayName: "Sam Manager",
  email: "manager@st6.dev",
  role: "MANAGER",
};

const icMe: SidebarMe = {
  teamName: "Acme Engineering",
  teamAvatarUrl: null,
  displayName: "Ada IC",
  email: "ada@st6.dev",
  role: "IC",
};

describe("SidebarShell", () => {
  afterEach(() => cleanup());

  it("renders the workspace pill with the team name from `me`", () => {
    renderWithRouter(
      <SidebarShell me={managerMe} onSignOut={vi.fn()}>
        <div>page content</div>
      </SidebarShell>,
    );
    // Team name appears in both the desktop rail's WorkspacePill and the
    // narrow-viewport top strip's TeamPill — jsdom doesn't apply the
    // responsive hide, so both are in the DOM. Scope to the desktop sidebar.
    const sidebar = document.querySelector('[data-cy="sidebar"]') as HTMLElement;
    expect(sidebar).toBeTruthy();
    expect(sidebar.textContent).toMatch(/acme engineering/i);
  });

  it("renders the user chip with the user's display name + role badge", () => {
    renderWithRouter(
      <SidebarShell me={managerMe} onSignOut={vi.fn()}>
        <div>page content</div>
      </SidebarShell>,
    );
    const trigger = screen.getByRole("button", { name: /account menu/i });
    expect(trigger.textContent).toContain("Sam Manager");
    expect(trigger.textContent?.toLowerCase()).toContain("manager");
  });

  it("renders children inside the main content area", () => {
    renderWithRouter(
      <SidebarShell me={managerMe} onSignOut={vi.fn()}>
        <div data-testid="page">page content</div>
      </SidebarShell>,
    );
    expect(screen.getByTestId("page")).toBeInTheDocument();
  });

  it("includes the Team route in the rail for MANAGER", () => {
    renderWithRouter(
      <SidebarShell me={managerMe} onSignOut={vi.fn()}>
        <div>page</div>
      </SidebarShell>,
    );
    expect(screen.getByRole("link", { name: /team/i })).toBeInTheDocument();
  });

  it("omits the Team route in the rail for IC", () => {
    renderWithRouter(
      <SidebarShell me={icMe} onSignOut={vi.fn()}>
        <div>page</div>
      </SidebarShell>,
    );
    expect(screen.queryByRole("link", { name: /team/i })).not.toBeInTheDocument();
  });

  // AE4: narrow-viewport drawer opens on hamburger tap, dismisses via the
  // overlay, Esc, or a route selection inside the drawer.
  it("Covers AE4. hamburger opens the drawer; overlay tap closes it", async () => {
    renderWithRouter(
      <SidebarShell me={managerMe} onSignOut={vi.fn()}>
        <div>page</div>
      </SidebarShell>,
    );
    // jsdom doesn't apply the md:hidden CSS, so both the hamburger and the
    // desktop rail are in the DOM. The drawer itself is the conditional bit.
    expect(document.querySelector('[data-cy="sidebar-drawer"]')).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }));
    expect(document.querySelector('[data-cy="sidebar-drawer"]')).not.toBeNull();

    await userEvent.click(document.querySelector('[data-cy="sidebar-overlay"]')!);
    expect(document.querySelector('[data-cy="sidebar-drawer"]')).toBeNull();
  });

  it("Esc closes the drawer when open", async () => {
    renderWithRouter(
      <SidebarShell me={managerMe} onSignOut={vi.fn()}>
        <div>page</div>
      </SidebarShell>,
    );
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }));
    expect(document.querySelector('[data-cy="sidebar-drawer"]')).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(document.querySelector('[data-cy="sidebar-drawer"]')).toBeNull();
  });

  it("clicking a NavLink inside the open drawer closes it", async () => {
    renderWithRouter(
      <SidebarShell me={managerMe} onSignOut={vi.fn()}>
        <div>page</div>
      </SidebarShell>,
    );
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }));
    const drawer = document.querySelector('[data-cy="sidebar-drawer"]')!;
    // The drawer's NavRail has the same links as the desktop rail; click any.
    const reconcileLink = drawer.querySelector('[data-cy="sidebar-reconcile"]') as HTMLElement;
    expect(reconcileLink).toBeTruthy();
    await userEvent.click(reconcileLink);
    expect(document.querySelector('[data-cy="sidebar-drawer"]')).toBeNull();
  });

  it("locks body scroll while the drawer is open and restores it on close", async () => {
    renderWithRouter(
      <SidebarShell me={managerMe} onSignOut={vi.fn()}>
        <div>page</div>
      </SidebarShell>,
    );
    expect(document.body.style.overflow).toBe("");
    await userEvent.click(screen.getByRole("button", { name: /open navigation/i }));
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });
});
