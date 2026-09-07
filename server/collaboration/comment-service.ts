import { prisma } from "@/server/db";
import { randomUUID } from "crypto";
import { requirePermission } from "./authorization";
import { getRealtimeProvider } from "./realtime-provider";
import { recordDeliveryFailure } from "./delivery-retry-service";
import { makeCommentEvent } from "@/lib/collaboration/events";
import type { AuthUser } from "@/lib/auth";
import type { Comment } from "@/lib/collaboration/types";
import type { NormalizedPoint } from "@/lib/markup/types";

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function dbToComment(c: {
  id: string; sessionId: string; planId: string; pageNumber: number | null;
  parentId: string | null; pinJson: string | null; targetType: string | null;
  targetId: string | null; authorId: string; body: string; status: string;
  resolvedBy: string | null; resolvedAt: Date | null; deletedAt: Date | null;
  assigneeId: string | null; revision: number; createdAt: Date; updatedAt: Date;
  author: { name: string };
}): Comment {
  return {
    id: c.id, sessionId: c.sessionId, planId: c.planId,
    pageNumber: c.pageNumber, parentId: c.parentId,
    pin: c.pinJson ? JSON.parse(c.pinJson) as NormalizedPoint : null,
    targetType: c.targetType as Comment["targetType"], targetId: c.targetId,
    authorId: c.authorId, authorName: c.author.name, body: c.body,
    status: c.status as "open" | "resolved",
    resolvedBy: c.resolvedBy, resolvedAt: c.resolvedAt?.toISOString() ?? null,
    deletedAt: c.deletedAt?.toISOString() ?? null,
    assigneeId: c.assigneeId, revision: c.revision,
    createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
  };
}

async function publishComment(
  type: "comment.created" | "comment.updated" | "comment.resolved" | "comment.deleted",
  comment: Comment, actor: { id: string; name: string },
  session: { organizationId: string; projectId: string; planId: string; id: string }
) {
  const ctx = { organizationId: session.organizationId, projectId: session.projectId, planId: session.planId, sessionId: session.id };
  const event = makeCommentEvent(type, comment, actor, ctx);
  const channel = `private-session-${session.id}`;
  try {
    await getRealtimeProvider().publish(channel, type, event);
  } catch (err) {
    await recordDeliveryFailure(channel, type, event, err as Error).catch(() => {});
  }
}

/** Parse @userId mentions from comment body */
function extractMentions(body: string, knownMentions: string[]): string[] {
  return [...new Set(knownMentions)];
}

export async function createComment(
  input: {
    body: string; pageNumber?: number; pin?: NormalizedPoint;
    targetType?: string; targetId?: string; parentId?: string;
    mentions?: string[]; assigneeId?: string;
  },
  actor: AuthUser,
  sessionId: string
): Promise<Comment> {
  const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId } });
  if (!session) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  if (session.status !== "active") throw Object.assign(new Error("Session is not active"), { statusCode: 409 });
  await requirePermission(actor.userId, session.projectId, "comment:write");

  const authorUser = await prisma.user.findUnique({ where: { id: actor.userId } });
  const authorName = authorUser?.name ?? actor.name;

  const mentions = extractMentions(input.body, input.mentions ?? []);

  const comment = await prisma.comment.create({
    data: {
      id: randomUUID(),
      sessionId,
      planId: session.planId,
      pageNumber: input.pageNumber ?? null,
      parentId: input.parentId ?? null,
      pinJson: input.pin ? JSON.stringify(input.pin) : null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      authorId: actor.userId,
      body: input.body,
      status: "open",
      assigneeId: input.assigneeId ?? null,
      revision: 1,
      mentions: {
        createMany: {
          data: mentions.map((userId) => ({
            id: randomUUID(),
            mentionedUserId: userId,
          })),
          skipDuplicates: true,
        },
      },
    },
    include: { author: true },
  });

  const typed = dbToComment(comment);
  await publishComment("comment.created", typed, { id: actor.userId, name: actor.name }, session);
  return typed;
}

export async function editComment(commentId: string, body: string, actor: AuthUser): Promise<Comment> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: true, session: true },
  });
  if (!comment || comment.deletedAt) throw Object.assign(new Error("Not found"), { statusCode: 404 });
  if (comment.authorId !== actor.userId) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  if (Date.now() - comment.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw Object.assign(new Error("Edit window expired (15 min)"), { statusCode: 409 });
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { body, revision: { increment: 1 } },
    include: { author: true },
  });

  const typed = dbToComment(updated);
  await publishComment("comment.updated", typed, { id: actor.userId, name: actor.name }, comment.session);
  return typed;
}

export async function softDeleteComment(commentId: string, actor: AuthUser): Promise<Comment> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: true, session: true },
  });
  if (!comment || comment.deletedAt) throw Object.assign(new Error("Not found"), { statusCode: 404 });
  if (comment.authorId !== actor.userId) {
    await requirePermission(actor.userId, comment.session.projectId, "comment:resolve-any");
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date(), revision: { increment: 1 } },
    include: { author: true },
  });

  const typed = dbToComment(updated);
  await publishComment("comment.deleted", typed, { id: actor.userId, name: actor.name }, comment.session);
  return typed;
}

export async function resolveComment(commentId: string, actor: AuthUser): Promise<Comment> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: true, session: true },
  });
  if (!comment || comment.deletedAt) throw Object.assign(new Error("Not found"), { statusCode: 404 });

  if (comment.authorId !== actor.userId) {
    await requirePermission(actor.userId, comment.session.projectId, "comment:resolve-any");
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { status: "resolved", resolvedBy: actor.userId, resolvedAt: new Date(), revision: { increment: 1 } },
    include: { author: true },
  });

  const typed = dbToComment(updated);
  await publishComment("comment.resolved", typed, { id: actor.userId, name: actor.name }, comment.session);
  return typed;
}

export async function reopenComment(commentId: string, actor: AuthUser): Promise<Comment> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: true, session: true },
  });
  if (!comment || comment.deletedAt) throw Object.assign(new Error("Not found"), { statusCode: 404 });

  if (comment.authorId !== actor.userId) {
    await requirePermission(actor.userId, comment.session.projectId, "comment:resolve-any");
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { status: "open", resolvedBy: null, resolvedAt: null, revision: { increment: 1 } },
    include: { author: true },
  });

  const typed = dbToComment(updated);
  await publishComment("comment.updated", typed, { id: actor.userId, name: actor.name }, comment.session);
  return typed;
}

export async function listComments(
  sessionId: string,
  filter: { status?: "open" | "resolved"; pageNumber?: number } = {}
): Promise<Comment[]> {
  const where: Record<string, unknown> = { sessionId, deletedAt: null };
  if (filter.status) where.status = filter.status;
  if (filter.pageNumber) where.pageNumber = filter.pageNumber;

  const comments = await prisma.comment.findMany({
    where,
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });

  return comments.map(dbToComment);
}
