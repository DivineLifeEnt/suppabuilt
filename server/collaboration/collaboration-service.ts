import { prisma } from "@/server/db";
import { randomUUID } from "crypto";
import { requirePermission } from "./authorization";
import { getRealtimeProvider } from "./realtime-provider";
import { recordDeliveryFailure } from "./delivery-retry-service";
import { recordAudit } from "./audit-service";
import { makeSessionEvent } from "@/lib/collaboration/events";
import type { AuthUser } from "@/lib/auth";
import type { StudioSession, SessionParticipant } from "@/lib/collaboration/types";

function sessionToType(s: {
  id: string; planId: string; projectId: string; organizationId: string;
  name: string; description: string | null; status: string;
  createdBy: string; endedBy: string | null; endedAt: Date | null;
  createdAt: Date; updatedAt: Date;
}): StudioSession {
  return {
    id: s.id, planId: s.planId, projectId: s.projectId, organizationId: s.organizationId,
    name: s.name, description: s.description,
    status: s.status as "active" | "ended" | "archived",
    createdBy: s.createdBy, endedBy: s.endedBy,
    endedAt: s.endedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(),
  };
}

async function publishSessionEvent(
  type: "session.created" | "session.ended" | "session.reopened" | "session.participant-joined" | "session.participant-left",
  session: StudioSession,
  actor: { id: string; name: string },
  payload: unknown
) {
  const ctx = { organizationId: session.organizationId, projectId: session.projectId, planId: session.planId, sessionId: session.id };
  const event = makeSessionEvent(type, session.id, actor, ctx, payload);
  const channel = `private-session-${session.id}`;
  try {
    await getRealtimeProvider().publish(channel, type, event);
  } catch (err) {
    await recordDeliveryFailure(channel, type, event, err as Error).catch(() => {});
  }
}

export async function createSession(
  input: { planId: string; projectId: string; name: string; description?: string },
  actor: AuthUser
): Promise<StudioSession> {
  await requirePermission(actor.userId, input.projectId, "session:manage");

  const org = await prisma.organizationMembership.findFirst({ where: { userId: actor.userId } });
  const organizationId = org?.organizationId ?? actor.orgId;

  const session = await prisma.collaborationSession.create({
    data: {
      id: randomUUID(),
      planId: input.planId,
      projectId: input.projectId,
      organizationId,
      name: input.name,
      description: input.description ?? null,
      status: "active",
      createdBy: actor.userId,
      participants: {
        create: {
          id: randomUUID(),
          userId: actor.userId,
          role: "project-admin",
          joinedAt: new Date(),
        },
      },
    },
  });

  const typed = sessionToType(session);
  await publishSessionEvent("session.created", typed, { id: actor.userId, name: actor.name }, typed);
  await recordAudit({
    organizationId, projectId: input.projectId, sessionId: session.id,
    actorId: actor.userId, actorName: actor.name,
    action: "session.created", aggregateType: "session", aggregateId: session.id,
    previousRevision: null, resultingRevision: null, patchJson: null,
    origin: "online", correlationId: randomUUID(),
  });
  return typed;
}

export async function joinSession(sessionId: string, actor: AuthUser): Promise<SessionParticipant> {
  const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId } });
  if (!session) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  await requirePermission(actor.userId, session.projectId, "view");

  const existing = await prisma.sessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId: actor.userId } },
  });

  let participant;
  if (existing) {
    participant = await prisma.sessionParticipant.update({
      where: { id: existing.id },
      data: { leftAt: null },
    });
  } else {
    participant = await prisma.sessionParticipant.create({
      data: { id: randomUUID(), sessionId, userId: actor.userId, role: "editor", joinedAt: new Date() },
    });
  }

  const typed = sessionToType(session);
  await publishSessionEvent("session.participant-joined", typed, { id: actor.userId, name: actor.name }, { userId: actor.userId, name: actor.name });

  return {
    id: participant.id, sessionId, userId: actor.userId,
    role: participant.role as "project-admin" | "editor" | "commenter" | "viewer",
    joinedAt: participant.joinedAt.toISOString(), leftAt: participant.leftAt?.toISOString() ?? null,
  };
}

export async function leaveSession(sessionId: string, actor: AuthUser): Promise<void> {
  const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  await prisma.sessionParticipant.updateMany({
    where: { sessionId, userId: actor.userId },
    data: { leftAt: new Date() },
  });

  const typed = sessionToType(session);
  await publishSessionEvent("session.participant-left", typed, { id: actor.userId, name: actor.name }, { userId: actor.userId, name: actor.name });
}

export async function endSession(sessionId: string, actor: AuthUser): Promise<StudioSession> {
  const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId } });
  if (!session) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  await requirePermission(actor.userId, session.projectId, "session:manage");

  const updated = await prisma.collaborationSession.update({
    where: { id: sessionId },
    data: { status: "ended", endedBy: actor.userId, endedAt: new Date() },
  });
  const typed = sessionToType(updated);
  await publishSessionEvent("session.ended", typed, { id: actor.userId, name: actor.name }, typed);
  return typed;
}

export async function reopenSession(sessionId: string, actor: AuthUser): Promise<StudioSession> {
  const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId } });
  if (!session) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  await requirePermission(actor.userId, session.projectId, "session:manage");

  const updated = await prisma.collaborationSession.update({
    where: { id: sessionId },
    data: { status: "active", endedBy: null, endedAt: null },
  });
  const typed = sessionToType(updated);
  await publishSessionEvent("session.reopened", typed, { id: actor.userId, name: actor.name }, typed);
  return typed;
}

export async function getSnapshot(sessionId: string) {
  const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId } });
  if (!session) throw Object.assign(new Error("Not found"), { statusCode: 404 });
  // Return counts only — full data fetched via existing markup/measurement/takeoff APIs
  return { sessionId, planId: session.planId, status: session.status };
}
