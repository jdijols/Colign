import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarToggle } from "./SidebarToggle";

describe("SidebarToggle", () => {
  afterEach(() => cleanup());

  it("renders an accessible label that reflects the current state", () => {
    const { rerender } = render(<SidebarToggle hidden onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /open sidebar/i })).toBeInTheDocument();
    rerender(<SidebarToggle hidden={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /close sidebar/i })).toBeInTheDocument();
  });

  it("reflects state via aria-expanded", () => {
    const { rerender } = render(<SidebarToggle hidden onToggle={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    rerender(<SidebarToggle hidden={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    render(<SidebarToggle hidden onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("renders a tooltip describing the action", () => {
    render(<SidebarToggle hidden onToggle={vi.fn()} />);
    // Tooltip is rendered always; CSS shows it on hover. The text is in the DOM.
    expect(screen.getByRole("tooltip")).toHaveTextContent(/open sidebar/i);
  });
});
