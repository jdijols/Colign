import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspacePill } from "./WorkspacePill";

describe("WorkspacePill", () => {
  afterEach(() => cleanup());

  it("renders name + initial fallback in default mode", () => {
    render(<WorkspacePill name="Acme Engineering" avatarUrl={null} />);
    expect(screen.getByText("Acme Engineering")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders nothing when name is empty", () => {
    const { container } = render(<WorkspacePill name="" avatarUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("compact mode hides the team name", () => {
    render(<WorkspacePill name="Acme Engineering" avatarUrl={null} compact />);
    // Initial still renders; the name string does not.
    expect(screen.queryByText("Acme Engineering")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders a non-interactive avatar in compact mode without onToggle", () => {
    render(<WorkspacePill name="Acme" avatarUrl={null} compact />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("compact + onToggle: avatar IS the open-sidebar toggle", async () => {
    const onToggle = vi.fn();
    render(<WorkspacePill name="Acme" avatarUrl={null} compact onToggle={onToggle} />);
    const button = screen.getByRole("button", { name: /open sidebar/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("compact + onToggle: tooltip describing the action is in the DOM", () => {
    render(<WorkspacePill name="Acme" avatarUrl={null} compact onToggle={vi.fn()} />);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/open sidebar/i);
  });
});
