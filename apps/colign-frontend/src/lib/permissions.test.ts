import { describe, expect, it } from "vitest";
import { canManageTeam } from "./permissions";
import type { MeDto } from "@/api/me";

const baseMe: MeDto = {
  id: 1,
  email: "u@example.com",
  displayName: "U",
  role: "IC",
  teamId: 10,
  managerId: null,
  needsInvite: false,
};

describe("canManageTeam", () => {
  it("allows ADMIN regardless of lead status", () => {
    expect(canManageTeam({ ...baseMe, role: "ADMIN" }, null)).toBe(true);
  });
  it("allows MANAGER", () => {
    expect(canManageTeam({ ...baseMe, role: "MANAGER" }, null)).toBe(true);
  });
  it("allows IC if they are team lead", () => {
    expect(canManageTeam({ ...baseMe, role: "IC" }, { leadUserId: 1 })).toBe(true);
  });
  it("denies IC who is not lead", () => {
    expect(canManageTeam({ ...baseMe, role: "IC" }, { leadUserId: 2 })).toBe(false);
  });
  it("denies if me or team is null", () => {
    expect(canManageTeam(null, { leadUserId: 1 })).toBe(false);
    expect(canManageTeam(baseMe, null)).toBe(false);
  });
});
