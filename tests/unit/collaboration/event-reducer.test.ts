import { describe, it, expect } from "vitest";
import { classifyEvent } from "@/lib/collaboration/event-reducer";
import type { RealtimeEvent } from "@/server/collaboration/realtime-provider";

function makeEvent(overrides: Partial<RealtimeEvent> = {}): RealtimeEvent {
  return {
    protocolVersion: 1,
    eventId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    type: "markup.created",
    organizationId: "org-1",
    projectId: "proj-1",
    planId: "plan-1",
    sessionId: "session-1",
    aggregateType: "markup",
    aggregateId: "markup-1",
    aggregateRevision: 1,
    actor: { id: "user-1", name: "Alice" },
    occurredAt: new Date().toISOString(),
    payload: {},
    ...overrides,
  };
}

const ORG = "org-1";
const SESSION = "session-1";

describe("classifyEvent", () => {
  it("returns 'duplicate' for a revision already known", () => {
    const known = new Map([["markup-1", 3]]);
    const ev = makeEvent({ aggregateRevision: 3 });
    expect(classifyEvent(ev, known, ORG, SESSION)).toBe("stale");
  });

  it("returns 'gap' when revision > known + 1", () => {
    const known = new Map([["markup-1", 1]]);
    const ev = makeEvent({ aggregateRevision: 5 });
    expect(classifyEvent(ev, known, ORG, SESSION)).toBe("gap");
  });

  it("returns 'applied' when revision = known + 1", () => {
    const known = new Map([["markup-1", 2]]);
    const ev = makeEvent({ aggregateRevision: 3 });
    expect(classifyEvent(ev, known, ORG, SESSION)).toBe("applied");
  });

  it("returns 'applied' for a new aggregate (not in known map)", () => {
    const known = new Map<string, number>();
    const ev = makeEvent({ aggregateId: "markup-new", aggregateRevision: 1 });
    expect(classifyEvent(ev, known, ORG, SESSION)).toBe("applied");
  });

  it("returns 'cross-tenant' when sessionId differs", () => {
    const known = new Map([["markup-1", 0]]);
    const ev = makeEvent({ sessionId: "session-other", aggregateRevision: 1 });
    expect(classifyEvent(ev, known, ORG, SESSION)).toBe("cross-tenant");
  });

  it("returns 'cross-tenant' when organizationId differs", () => {
    const known = new Map([["markup-1", 0]]);
    const ev = makeEvent({ organizationId: "org-other", aggregateRevision: 1 });
    expect(classifyEvent(ev, known, ORG, SESSION)).toBe("cross-tenant");
  });

  it("returns 'stale' for revision less than known", () => {
    const known = new Map([["markup-1", 5]]);
    const ev = makeEvent({ aggregateRevision: 2 });
    expect(classifyEvent(ev, known, ORG, SESSION)).toBe("stale");
  });
});
