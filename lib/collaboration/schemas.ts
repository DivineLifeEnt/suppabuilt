import { z } from "zod";

const NormalizedPointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

export const CreateSessionSchema = z.object({
  planId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(2000),
  pageNumber: z.number().int().positive().optional(),
  pin: NormalizedPointSchema.optional(),
  targetType: z.enum(["markup", "measurement", "takeoff", "plan"]).optional(),
  targetId: z.string().optional(),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).max(20).default([]),
  assigneeId: z.string().optional(),
});

export const EditCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const RealtimeEventSchema = z.object({
  protocolVersion: z.literal(1),
  eventId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  type: z.string().min(1),
  organizationId: z.string().min(1),
  projectId: z.string().min(1),
  planId: z.string().min(1),
  sessionId: z.string().min(1),
  aggregateType: z.enum(["markup", "measurement", "calibration", "takeoff", "comment", "session", "presence"]),
  aggregateId: z.string().min(1),
  aggregateRevision: z.number().int().min(0),
  actor: z.object({ id: z.string(), name: z.string() }),
  occurredAt: z.string().datetime(),
  payload: z.unknown(),
});

export const PresenceUpdateSchema = z.object({
  pageNumber: z.number().int().min(1),
  cursor: NormalizedPointSchema.nullable(),
  activeTool: z.string().nullable(),
  selectedIds: z.array(z.string()).max(50),
  isTyping: z.boolean(),
});

export const PusherWebhookSchema = z.object({
  time_ms: z.number(),
  events: z.array(z.object({
    name: z.string(),
    channel: z.string().optional(),
    user_id: z.string().optional(),
    socket_id: z.string().optional(),
  })),
});
