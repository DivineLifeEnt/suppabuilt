import { describe, it, expect } from "vitest";
import type {
  ConflictKind,
  ConflictResolution,
  Conflict,
} from "@/lib/collaboration/reconciliation";
import { isAutoResolvable, diffMetadata } from "@/lib/collaboration/reconciliation";

describe("ConflictKind values", () => {
  it("covers all 4 variants", () => {
    const kinds: ConflictKind[] = [
      "geometry",
      "metadata",
      "deleted-remote",
      "session-ended",
    ];
    expect(kinds).toHaveLength(4);
  });
});

describe("Conflict shape", () => {
  function makeConflict(kind: ConflictKind): Conflict {
    return {
      aggregateType: "markup",
      aggregateId: "markup-1",
      kind,
      localState: { x: 1 },
      serverState: { x: 2 },
      serverRevision: 5,
    };
  }

  it("geometry conflict has kind 'geometry'", () => {
    const c = makeConflict("geometry");
    expect(c.kind).toBe("geometry");
  });

  it("metadata conflict has kind 'metadata'", () => {
    const c = makeConflict("metadata");
    expect(c.kind).toBe("metadata");
  });

  it("isAutoResolvable returns false for geometry conflicts", () => {
    expect(isAutoResolvable(makeConflict("geometry"))).toBe(false);
  });

  it("isAutoResolvable returns true for metadata conflicts", () => {
    expect(isAutoResolvable(makeConflict("metadata"))).toBe(true);
  });

  it("isAutoResolvable returns true for deleted-remote", () => {
    expect(isAutoResolvable(makeConflict("deleted-remote"))).toBe(true);
  });
});

describe("ConflictResolution discriminated union", () => {
  it("accepts keep-mine action", () => {
    const r: ConflictResolution = { action: "keep-mine" };
    expect(r.action).toBe("keep-mine");
  });

  it("accepts accept-theirs action", () => {
    const r: ConflictResolution = { action: "accept-theirs" };
    expect(r.action).toBe("accept-theirs");
  });

  it("accepts discard-local action", () => {
    const r: ConflictResolution = { action: "discard-local" };
    expect(r.action).toBe("discard-local");
  });
});

describe("diffMetadata", () => {
  it("returns empty array when objects are equal", () => {
    const diffs = diffMetadata({ a: 1, b: "x" }, { a: 1, b: "x" });
    expect(diffs).toHaveLength(0);
  });

  it("detects changed fields", () => {
    const diffs = diffMetadata({ a: 1, b: "old" }, { a: 1, b: "new" });
    expect(diffs).toHaveLength(1);
    expect(diffs[0].field).toBe("b");
    expect(diffs[0].local).toBe("old");
    expect(diffs[0].server).toBe("new");
  });

  it("detects fields present only in local", () => {
    const diffs = diffMetadata({ a: 1, extra: true }, { a: 1 });
    expect(diffs.some((d) => d.field === "extra")).toBe(true);
  });

  it("detects fields present only in server", () => {
    const diffs = diffMetadata({ a: 1 }, { a: 1, newField: 42 });
    expect(diffs.some((d) => d.field === "newField")).toBe(true);
  });
});
