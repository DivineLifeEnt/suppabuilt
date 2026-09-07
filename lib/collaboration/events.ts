import { randomUUID } from "crypto";
import type { RealtimeEvent } from "@/server/collaboration/realtime-provider";
import type { Markup } from "@/lib/markup/types";
import type { Measurement, Calibration } from "@/lib/measurement/types";
import type { TakeoffItem } from "@/lib/takeoff/types";
import type { Comment } from "./types";

export type Actor = { id: string; name: string };

export type EventContext = {
  organizationId: string;
  projectId: string;
  planId: string;
  sessionId: string;
};

function makeBase(
  type: string,
  aggregateType: RealtimeEvent["aggregateType"],
  aggregateId: string,
  aggregateRevision: number,
  actor: Actor,
  ctx: EventContext,
  payload: unknown
): RealtimeEvent {
  return {
    protocolVersion: 1,
    eventId: randomUUID(),
    idempotencyKey: randomUUID(),
    type,
    organizationId: ctx.organizationId,
    projectId: ctx.projectId,
    planId: ctx.planId,
    sessionId: ctx.sessionId,
    aggregateType,
    aggregateId,
    aggregateRevision,
    actor,
    occurredAt: new Date().toISOString(),
    payload,
  };
}

export function makeMarkupEvent(
  type: "markup.created" | "markup.updated" | "markup.deleted",
  markup: Markup,
  actor: Actor,
  ctx: EventContext
): RealtimeEvent {
  return makeBase(type, "markup", markup.id, markup.revision, actor, ctx, markup);
}

export function makeMeasurementEvent(
  type: "measurement.created" | "measurement.updated" | "measurement.deleted",
  measurement: Measurement,
  actor: Actor,
  ctx: EventContext
): RealtimeEvent {
  return makeBase(type, "measurement", measurement.id, measurement.revision, actor, ctx, measurement);
}

export function makeCalibrationEvent(
  type: "calibration.created" | "calibration.updated" | "calibration.deleted",
  calibration: Calibration,
  actor: Actor,
  ctx: EventContext
): RealtimeEvent {
  return makeBase(type, "calibration", calibration.id, calibration.revision, actor, ctx, calibration);
}

export function makeTakeoffEvent(
  type: "takeoff.created" | "takeoff.updated" | "takeoff.deleted",
  item: TakeoffItem,
  actor: Actor,
  ctx: EventContext
): RealtimeEvent {
  return makeBase(type, "takeoff", item.id, item.revision, actor, ctx, item);
}

export function makeCommentEvent(
  type: "comment.created" | "comment.updated" | "comment.resolved" | "comment.deleted",
  comment: Comment,
  actor: Actor,
  ctx: EventContext
): RealtimeEvent {
  return makeBase(type, "comment", comment.id, comment.revision, actor, ctx, comment);
}

export function makeSessionEvent(
  type: "session.created" | "session.ended" | "session.reopened" | "session.participant-joined" | "session.participant-left",
  sessionId: string,
  actor: Actor,
  ctx: EventContext,
  payload: unknown
): RealtimeEvent {
  return makeBase(type, "session", sessionId, 0, actor, ctx, payload);
}
