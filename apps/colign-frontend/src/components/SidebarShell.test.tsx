import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
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
    expect(screen.getByText(/acme engineering/i)).toBeInTheDocument();
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
});
