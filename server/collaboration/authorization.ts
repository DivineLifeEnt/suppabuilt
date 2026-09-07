import { prisma } from "@/server/db";
import {
  hasPermission,
  getEffectiveProjectRole,
  type Permission,
  type ProjectRole,
  type OrganizationRole,
} from "@/lib/collaboration/permissions";
import type { StudioSession } from "@/lib/collaboration/types";

export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  // Get org membership for the project
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const orgMembership = await prisma.organizationMembership.findFirst({
    where: { userId },
  });
  const orgRole: OrganizationRole = (orgMembership?.role as OrganizationRole) ?? "member";

  const projMembership = await prisma.projectMembership.findFirst({
    where: { projectId, userId },
  });
  const projRole = (projMembership?.role as ProjectRole | null) ?? null;

  return getEffectiveProjectRole(orgRole, projRole);
}

export async function requirePermission(
  userId: string,
  projectId: string,
  permission: Permission
): Promise<void> {
  const role = await getProjectRole(userId, projectId);
  if (!role || !hasPermission(role, permission)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
}

export async function requireSessionAccess(
  userId: string,
  sessionId: string,
  permission: Permission
): Promise<StudioSession> {
  const session = await prisma.collaborationSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    // Don't reveal existence — return 403
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  await requirePermission(userId, session.projectId, permission);
  return {
    id: session.id,
    planId: session.planId,
    projectId: session.projectId,
    organizationId: session.organizationId,
    name: session.name,
    description: session.description,
    status: session.status as "active" | "ended" | "archived",
    createdBy: session.createdBy,
    endedBy: session.endedBy,
    endedAt: session.endedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}
