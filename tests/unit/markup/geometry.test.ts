import { describe, it, expect } from "vitest";
import {
  screenToNormalized,
  normalizedToScreen,
  normalizeBounds,
  rotatePt,
  unrotatePt,
  hitTest,
} from "@/lib/markup/geometry";
import type { MarkupBase, PointGeometry } from "@/lib/markup/types";

function makeRect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    x, y, width: w, height: h,
    top: y, left: x, right: x + w, bottom: y + h,
    toJSON: () => ({}),
  } as DOMRect;
}

const pageDims = { width: 800, height: 600 };

describe("normalizeBounds", () => {
  it("produces canonical bounds regardless of drag direction", () => {
    const b1 = normalizeBounds({ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 });
    expect(b1).toEqual({ x: 0.1, y: 0.1, width: 0.4, height: 0.4 });

    const b2 = normalizeBounds({ x: 0.5, y: 0.5 }, { x: 0.1, y: 0.1 });
    expect(b2).toEqual({ x: 0.1, y: 0.1, width: 0.4, height: 0.4 });
  });
});

describe("rotatePt / unrotatePt — 0°", () => {
  it("0° rotation is identity", () => {
    const pt = { x: 0.3, y: 0.7 };
    expect(rotatePt(pt, 0, pageDims)).toEqual(pt);
    expect(unrotatePt(pt, 0, pageDims)).toEqual(pt);
  });
});

describe("rotatePt / unrotatePt — 90°", () => {
  it("rotate(90°) then unrotate(90°) returns original", () => {
    const pt = { x: 0.3, y: 0.2 };
    const rotated = rotatePt(pt, 90, pageDims);
    const back = unrotatePt(rotated, 90, pageDims);
    expect(back.x).toBeCloseTo(pt.x, 8);
    expect(back.y).toBeCloseTo(pt.y, 8);
  });

  it("90° rotates correctly: (0,0) → (0,1)", () => {
    const r = rotatePt({ x: 0, y: 0 }, 90, pageDims);
    expect(r).toEqual({ x: 0, y: 1 });
  });

  it("90° rotates correctly: (1,0) → (0,0)", () => {
    const r = rotatePt({ x: 1, y: 0 }, 90, pageDims);
    expect(r).toEqual({ x: 0, y: 0 });
  });
});

describe("rotatePt / unrotatePt — 180°", () => {
  it("180° rotates (0.3, 0.7) → (0.7, 0.3)", () => {
    const r = rotatePt({ x: 0.3, y: 0.7 }, 180, pageDims);
    expect(r.x).toBeCloseTo(0.7, 8);
    expect(r.y).toBeCloseTo(0.3, 8);
  });

  it("rotate(180°) then unrotate(180°) returns original", () => {
    const pt = { x: 0.3, y: 0.7 };
    const back = unrotatePt(rotatePt(pt, 180, pageDims), 180, pageDims);
    expect(back.x).toBeCloseTo(pt.x, 8);
    expect(back.y).toBeCloseTo(pt.y, 8);
  });
});

describe("rotatePt / unrotatePt — 270°", () => {
  it("rotate(270°) then unrotate(270°) returns original", () => {
    const pt = { x: 0.6, y: 0.4 };
    const back = unrotatePt(rotatePt(pt, 270, pageDims), 270, pageDims);
    expect(back.x).toBeCloseTo(pt.x, 8);
    expect(back.y).toBeCloseTo(pt.y, 8);
  });
});

describe("screenToNormalized / normalizedToScreen — round trip", () => {
  it("round-trips at 0° rotation", () => {
    const rect = makeRect(100, 50, 800, 600);
    const zoom = 1;
    const norm = screenToNormalized(
      { x: 300, y: 200 },
      rect, zoom, 0, 800, 600
    );
    const screen = normalizedToScreen(norm, rect, zoom, 0, 800, 600);
    expect(screen.x).toBeCloseTo(300, 1);
    expect(screen.y).toBeCloseTo(200, 1);
  });

  it("normalizes to [0,1] range", () => {
    const rect = makeRect(0, 0, 1000, 800);
    const norm = screenToNormalized({ x: 500, y: 400 }, rect, 1, 0, 1000, 800);
    expect(norm.x).toBeCloseTo(0.5, 5);
    expect(norm.y).toBeCloseTo(0.5, 5);
  });
});

describe("hitTest", () => {
  const baseMarkup: MarkupBase = {
    id: "test",
    planId: "00000000-0000-4000-a000-000000000001",
    pageNumber: 1,
    tool: "pin",
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

  it("hits a point markup near its center", () => {
    const m = { ...baseMarkup, kind: "point" as const, tool: "pin" as const, point: { x: 0.5, y: 0.5 } };
    expect(hitTest(m, { x: 0.5, y: 0.5 }, 8, 1)).toBe(true);
  });

  it("misses a point markup far away", () => {
    const m = { ...baseMarkup, kind: "point" as const, tool: "pin" as const, point: { x: 0.5, y: 0.5 } };
    expect(hitTest(m, { x: 0.9, y: 0.9 }, 8, 1)).toBe(false);
  });

  it("hits a bounds markup inside its rect", () => {
    const m = {
      ...baseMarkup,
      kind: "bounds" as const,
      tool: "rectangle" as const,
      bounds: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
    };
    expect(hitTest(m, { x: 0.3, y: 0.3 }, 5, 1)).toBe(true);
  });

  it("misses a bounds markup outside", () => {
    const m = {
      ...baseMarkup,
      kind: "bounds" as const,
      tool: "rectangle" as const,
      bounds: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
    };
    expect(hitTest(m, { x: 0.8, y: 0.8 }, 5, 1)).toBe(false);
  });

  it("returns false for hidden markup", () => {
    const m = {
      ...baseMarkup,
      visible: false,
      kind: "point" as const,
      tool: "pin" as const,
      point: { x: 0.5, y: 0.5 },
    };
    expect(hitTest(m, { x: 0.5, y: 0.5 }, 8, 1)).toBe(false);
  });
});
