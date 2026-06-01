import { describe, expect, it } from "vitest";
// @ts-expect-error tailwind.config.js is a CommonJS-ish source file with no
// .d.ts; we read theme.extend tokens defensively via Record<string, string>.
import tailwindConfig from "../../tailwind.config.js";

describe("Tailwind fluid token contract (spec §4.2)", () => {
  it("exposes the fluid type scale", () => {
    const fontSize = tailwindConfig.theme.extend.fontSize as Record<string, string>;
    expect(fontSize["fluid-sm"]).toBe("clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem)");
    expect(fontSize["fluid-base"]).toBe("clamp(0.9375rem, 0.91rem + 0.16vw, 1rem)");
    expect(fontSize["fluid-lg"]).toBe("clamp(1.0625rem, 1.02rem + 0.22vw, 1.125rem)");
    expect(fontSize["fluid-xl"]).toBe("clamp(1.25rem, 1.18rem + 0.36vw, 1.5rem)");
    expect(fontSize["fluid-2xl"]).toBe("clamp(1.5rem, 1.36rem + 0.71vw, 2rem)");
    expect(fontSize["fluid-3xl"]).toBe("clamp(1.875rem, 1.55rem + 1.61vw, 3rem)");
  });
  it("exposes section-fluid spacing", () => {
    const spacing = tailwindConfig.theme.extend.spacing as Record<string, string>;
    expect(spacing["section-fluid"]).toBe("clamp(1.5rem, 1.0rem + 2.5vw, 4rem)");
  });
});
