import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button size contract (spec §4.3 + responsive.css)", () => {
  it("size=sm → h-8 (32px) meets pointer:fine floor", () => {
    render(<Button size="sm">Tap</Button>);
    expect(screen.getByRole("button", { name: "Tap" }).className).toMatch(
      /\bh-8\b/
    );
  });
  it("size=md → h-10 (40px); coarse pointers lift to 44 via responsive.css", () => {
    render(<Button size="md">Tap</Button>);
    expect(screen.getByRole("button", { name: "Tap" }).className).toMatch(
      /\bh-10\b/
    );
  });
  it("size=lg → h-11 (44px) meets coarse floor at compile time", () => {
    render(<Button size="lg">Tap</Button>);
    expect(screen.getByRole("button", { name: "Tap" }).className).toMatch(
      /\bh-11\b/
    );
  });
});
