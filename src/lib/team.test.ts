import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  allowedRolesForCreator,
  canAssignRole,
  canEditUser,
  canManageTeam,
} from "./team";

const admin = {
  id: "1",
  role: Role.ADMIN,
  organizationId: "org",
};
const manager = {
  id: "2",
  role: Role.MANAGER,
  organizationId: "org",
};
const staff = {
  id: "3",
  role: Role.STAFF,
  organizationId: "org",
};

describe("team rbac", () => {
  it("lets admins and managers manage the team", () => {
    expect(canManageTeam(admin)).toBe(true);
    expect(canManageTeam(manager)).toBe(true);
    expect(canManageTeam(staff)).toBe(false);
  });

  it("restricts role assignment", () => {
    expect(allowedRolesForCreator(admin)).toContain(Role.ADMIN);
    expect(allowedRolesForCreator(manager)).toEqual([Role.STAFF]);
    expect(canAssignRole(manager, Role.ADMIN)).toBe(false);
  });

  it("lets managers edit staff only", () => {
    expect(canEditUser(manager, { id: "x", role: Role.STAFF })).toBe(true);
    expect(canEditUser(manager, { id: "x", role: Role.MANAGER })).toBe(false);
    expect(canEditUser(admin, { id: "x", role: Role.MANAGER })).toBe(true);
  });
});
