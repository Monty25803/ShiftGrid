import { Role } from "@prisma/client";
import type { Session } from "next-auth";

export type SessionUser = {
  id: string;
  role: Role;
  organizationId: string | null;
  name?: string | null;
  email?: string | null;
};

export function getSessionUser(session: Session | null): SessionUser | null {
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    organizationId: session.user.organizationId ?? null,
    name: session.user.name,
    email: session.user.email,
  };
}

export function isManagerOrAdmin(role: Role): boolean {
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function requireOrgId(user: SessionUser): string {
  if (!user.organizationId) {
    throw new Error("User is not assigned to an organization");
  }
  return user.organizationId;
}

export function assertSameOrg(user: SessionUser, organizationId: string) {
  if (user.organizationId !== organizationId) {
    throw new Error("Cross-organization access denied");
  }
}

export function canManageSchedule(user: SessionUser): boolean {
  return isManagerOrAdmin(user.role);
}

export function canViewShift(
  user: SessionUser,
  shift: { organizationId: string; assigneeId: string | null },
): boolean {
  if (user.organizationId !== shift.organizationId) return false;
  if (canManageSchedule(user)) return true;
  return shift.assigneeId === user.id;
}
