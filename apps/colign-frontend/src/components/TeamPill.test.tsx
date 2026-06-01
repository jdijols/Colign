import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TeamPill } from "./TeamPill";

describe("TeamPill", () => {
  afterEach(cleanup);

  it("renders team name", () => {
    render(<TeamPill name="Acme Co" avatarUrl={null} />);
    expect(screen.getByText("Acme Co")).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl is set", () => {
    render(<TeamPill name="Acme Co" avatarUrl="https://x/a.png" />);
    expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("src", "https://x/a.png");
  });

  it("falls back to initial when avatarUrl is null", () => {
    render(<TeamPill name="Acme Co" avatarUrl={null} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("returns null when name is empty", () => {
    const { container } = render(<TeamPill name="" avatarUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
