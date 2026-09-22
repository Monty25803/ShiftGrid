import { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/rbac";
import { canManageSchedule } from "@/lib/rbac";

export function canManageTeam(user: SessionUser): boolean {
  return canManageSchedule(user);
}

/** Who the actor is allowed to assign as a role. */
export function allowedRolesForCreator(actor: SessionUser): Role[] {
  if (actor.role === Role.ADMIN) {
    return [Role.ADMIN, Role.MANAGER, Role.STAFF];
  }
  if (actor.role === Role.MANAGER) {
    return [Role.STAFF];
  }
  return [];
}

export function canEditUser(actor: SessionUser, target: { role: Role; id: string }): boolean {
  if (!canManageTeam(actor)) return false;
  if (actor.id === target.id && actor.role !== Role.ADMIN) {
    // managers shouldn't demote/edit themselves via team page in ways that break access;
    // still allow profile fields but role changes handled separately
  }
  if (actor.role === Role.ADMIN) return true;
  // Managers may only edit STAFF
  return target.role === Role.STAFF;
}

export function canAssignRole(actor: SessionUser, role: Role): boolean {
  return allowedRolesForCreator(actor).includes(role);
}

export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  hourlyRate: true,
  contact: true,
  active: true,
  createdAt: true,
} as const;
