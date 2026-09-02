import { describe, it, expect } from "vitest";
import {
  createHistoryStack,
  pushCommand,
  pushOrCoalesceMove,
  undo,
  redo,
} from "@/lib/markup/history";
import type { Markup } from "@/lib/markup/types";

function makePinMarkup(id: string): Markup {
  return {
    id,
    planId: "00000000-0000-4000-a000-000000000001",
    pageNumber: 1,
    tool: "pin",
    kind: "point",
    point: { x: 0.5, y: 0.5 },
    style: { color: "#F00", strokeWidth: 2, opacity: 1, fontSize: 16 },
    status: "open",
    locked: false,
    visible: true,
    zIndex: 0,
    revision: 1,
    authorName: "Test",
    label: null,
    comment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("history — undo / redo AddMarkup", () => {
  it("undo AddMarkup removes the markup", () => {
    const m = makePinMarkup("m1");
    let stack = createHistoryStack();
    let markups: Record<string, Markup> = {};

    stack = pushCommand(stack, { type: "AddMarkup", markup: m });
    markups = { ...markups, m1: m };

    expect(Object.keys(markups)).toHaveLength(1);

    const result = undo(stack, markups);
    expect(result).not.toBeNull();
    expect(Object.keys(result!.markups)).toHaveLength(0);
    expect(result!.stack.past).toHaveLength(0);
    expect(result!.stack.future).toHaveLength(1);
  });

  it("redo AddMarkup re-adds the markup", () => {
    const m = makePinMarkup("m1");
    let stack = createHistoryStack();
    let markups: Record<string, Markup> = {};

    stack = pushCommand(stack, { type: "AddMarkup", markup: m });
    markups = { ...markups, m1: m };

    const undone = undo(stack, markups)!;
    const redone = redo(undone.stack, undone.markups)!;
    expect(Object.keys(redone.markups)).toHaveLength(1);
    expect(redone.stack.future).toHaveLength(0);
  });
});

describe("history — undo / redo DeleteMarkup", () => {
  it("undo DeleteMarkup restores the markup", () => {
    const m = makePinMarkup("m1");
    const markups: Record<string, Markup> = { m1: m };
    let stack = createHistoryStack();
    stack = pushCommand(stack, { type: "DeleteMarkup", markup: m });
    const markupsAfterDelete = {};

    const result = undo(stack, markupsAfterDelete)!;
    expect(result.markups["m1"]).toBeDefined();
  });
});

describe("history — coalesce MoveMarkup", () => {
  it("coalesces consecutive moves for same id into one command", () => {
    const m = makePinMarkup("m1");
    let stack = createHistoryStack();

    stack = pushOrCoalesceMove(stack, {
      type: "MoveMarkup",
      id: "m1",
      before: { point: { x: 0.5, y: 0.5 } },
      after: { point: { x: 0.6, y: 0.5 } },
    });
    stack = pushOrCoalesceMove(stack, {
      type: "MoveMarkup",
      id: "m1",
      before: { point: { x: 0.5, y: 0.5 } }, // original before preserved by coalesce
      after: { point: { x: 0.7, y: 0.5 } },
    });
    stack = pushOrCoalesceMove(stack, {
      type: "MoveMarkup",
      id: "m1",
      before: { point: { x: 0.5, y: 0.5 } },
      after: { point: { x: 0.9, y: 0.5 } },
    });

    expect(stack.past).toHaveLength(1);
    const cmd = stack.past[0];
    expect(cmd.type).toBe("MoveMarkup");
    if (cmd.type === "MoveMarkup") {
      expect(cmd.after.point?.x).toBeCloseTo(0.9);
      // before should be the original position from the first push
      expect(cmd.before.point?.x).toBeCloseTo(0.5);
    }
  });

  it("does not coalesce moves for different ids", () => {
    let stack = createHistoryStack();
    stack = pushOrCoalesceMove(stack, {
      type: "MoveMarkup",
      id: "m1",
      before: { point: { x: 0.1, y: 0.1 } },
      after: { point: { x: 0.2, y: 0.1 } },
    });
    stack = pushOrCoalesceMove(stack, {
      type: "MoveMarkup",
      id: "m2",
      before: { point: { x: 0.5, y: 0.5 } },
      after: { point: { x: 0.6, y: 0.5 } },
    });
    expect(stack.past).toHaveLength(2);
  });
});

describe("history — undo returns null when empty", () => {
  it("returns null when no past commands", () => {
    const stack = createHistoryStack();
    expect(undo(stack, {})).toBeNull();
  });
});

describe("history — redo returns null when empty", () => {
  it("returns null when no future commands", () => {
    const stack = createHistoryStack();
    expect(redo(stack, {})).toBeNull();
  });
});
