import { describe, it, expect } from "vitest";
import { makeMarkupEvent } from "@/lib/collaboration/events";
import { RealtimeEventSchema } from "@/lib/collaboration/schemas";
import type { Markup } from "@/lib/markup/types";

const ctx = {
  organizationId: "org-1",
  projectId: "proj-1",
  planId: "plan-1",
  sessionId: "session-1",
};

const actor = { id: "user-1", name: "Alice" };

function makeMarkup(overrides?: Partial<Markup>): Markup {
  return {
    id: "markup-abc",
    planId: "plan-1",
    pageNumber: 1,
    revision: 1,
    tool: "pin",
    kind: "point",
    point: { x: 0.5, y: 0.5 },
    style: { color: "#EF4444", strokeWidth: 2, opacity: 1, fontSize: 16 },
    status: "open",
    locked: false,
    visible: true,
    zIndex: 0,
    authorName: "Alice",
    label: null,
    comment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Markup;
}

describe("makeMarkupEvent", () => {
  it("produces protocolVersion=1", () => {
    const ev = makeMarkupEvent("markup.created", makeMarkup(), actor, ctx);
    expect(ev.protocolVersion).toBe(1);
  });

  it("eventId is a UUID", () => {
    const ev = makeMarkupEvent("markup.created", makeMarkup(), actor, ctx);
    expect(ev.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("occurredAt is an ISO 8601 date string", () => {
    const ev = makeMarkupEvent("markup.created", makeMarkup(), actor, ctx);
    expect(() => new Date(ev.occurredAt)).not.toThrow();
    expect(ev.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("carries correct sessionId and aggregateType", () => {
    const ev = makeMarkupEvent("markup.updated", makeMarkup(), actor, ctx);
    expect(ev.sessionId).toBe("session-1");
    expect(ev.aggregateType).toBe("markup");
  });

  it("cross-session event has different sessionId", () => {
    const otherCtx = { ...ctx, sessionId: "session-other" };
    const ev = makeMarkupEvent("markup.created", makeMarkup(), actor, otherCtx);
    expect(ev.sessionId).not.toBe(ctx.sessionId);
  });
});

describe("RealtimeEventSchema", () => {
  it("accepts a valid event produced by makeMarkupEvent", () => {
    const ev = makeMarkupEvent("markup.created", makeMarkup(), actor, ctx);
    const result = RealtimeEventSchema.safeParse(ev);
    expect(result.success).toBe(true);
  });

  it("rejects an event missing required fields", () => {
    const incomplete = { protocolVersion: 1, eventId: "not-a-uuid" };
    const result = RealtimeEventSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("rejects protocolVersion !== 1", () => {
    const ev = makeMarkupEvent("markup.created", makeMarkup(), actor, ctx);
    const result = RealtimeEventSchema.safeParse({ ...ev, protocolVersion: 2 });
    expect(result.success).toBe(false);
  });
});
