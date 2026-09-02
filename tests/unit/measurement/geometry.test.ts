import { describe, it, expect } from "vitest";
import {
  distance,
  polylineLength,
  perimeter,
  polygonArea,
  rectangleArea,
  circleRadius,
  interiorAngle,
  midpoint,
  pointToSegmentDistance,
  segmentIntersection,
  constrainAngle,
  isSelfIntersecting,
  isValidNormalizedPoint,
  validatePolygon,
} from "@/lib/measurement/geometry";
import type { NormalizedPoint } from "@/lib/markup/types";

const pt = (x: number, y: number): NormalizedPoint => ({ x, y });

describe("distance", () => {
  it("computes zero for same point", () => {
    expect(distance(pt(0.5, 0.5), pt(0.5, 0.5))).toBe(0);
  });
  it("computes horizontal distance", () => {
    expect(distance(pt(0, 0), pt(1, 0))).toBeCloseTo(1);
  });
  it("computes diagonal distance", () => {
    expect(distance(pt(0, 0), pt(0.3, 0.4))).toBeCloseTo(0.5);
  });
});

describe("polylineLength", () => {
  it("returns 0 for single point", () => {
    expect(polylineLength([pt(0, 0)])).toBe(0);
  });
  it("sums segment distances", () => {
    const pts = [pt(0, 0), pt(1, 0), pt(1, 1)];
    expect(polylineLength(pts)).toBeCloseTo(2);
  });
  it("returns 0 for empty", () => {
    expect(polylineLength([])).toBe(0);
  });
});

describe("perimeter", () => {
  it("includes closing segment", () => {
    const pts = [pt(0, 0), pt(1, 0), pt(1, 1)];
    // sides: 1, 1, sqrt(2) ≈ 1.414
    expect(perimeter(pts)).toBeCloseTo(2 + Math.sqrt(2));
  });
  it("returns 0 for 0 or 1 point", () => {
    expect(perimeter([])).toBe(0);
    expect(perimeter([pt(0, 0)])).toBe(0);
  });
});

describe("polygonArea", () => {
  it("computes unit square area", () => {
    const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
    expect(Math.abs(polygonArea(pts))).toBeCloseTo(1);
  });
  it("returns 0 for line (degenerate)", () => {
    expect(polygonArea([pt(0, 0), pt(1, 0)])).toBeCloseTo(0);
  });
  it("handles triangle", () => {
    const pts = [pt(0, 0), pt(2, 0), pt(1, 2)];
    expect(Math.abs(polygonArea(pts))).toBeCloseTo(2);
  });
});

describe("rectangleArea", () => {
  it("computes rectangle area from bounds", () => {
    expect(rectangleArea({ x: 0, y: 0, width: 2, height: 3 })).toBeCloseTo(6);
  });
  it("zero area for zero width", () => {
    expect(rectangleArea({ x: 0, y: 0, width: 0, height: 3 })).toBe(0);
  });
});

describe("circleRadius", () => {
  it("computes distance from center to edge", () => {
    expect(circleRadius(pt(0, 0), pt(0, 0.5))).toBeCloseTo(0.5);
  });
});

describe("interiorAngle", () => {
  it("computes 90 degrees for right angle", () => {
    // vertex at origin, arm a along x-axis, arm b along y-axis → 90°
    const angle = interiorAngle(pt(0, 0), pt(1, 0), pt(0, 1));
    expect(angle).toBeCloseTo(90, 0);
  });
  it("computes 180 for collinear (straight line)", () => {
    // vertex in middle, arms pointing opposite directions → 180°
    const angle = interiorAngle(pt(0.5, 0), pt(0, 0), pt(1, 0));
    expect(angle).toBeCloseTo(180, 0);
  });
});

describe("midpoint", () => {
  it("returns midpoint of two points", () => {
    const m = midpoint(pt(0, 0), pt(1, 1));
    expect(m.x).toBeCloseTo(0.5);
    expect(m.y).toBeCloseTo(0.5);
  });
});

describe("pointToSegmentDistance", () => {
  it("returns perpendicular distance to segment", () => {
    // Point (0.5, 0.5), segment from (0,0) to (1,0)
    expect(pointToSegmentDistance(pt(0.5, 0.5), pt(0, 0), pt(1, 0))).toBeCloseTo(0.5);
  });
  it("clamps to endpoint when point is beyond segment", () => {
    // Point far to the right
    expect(pointToSegmentDistance(pt(2, 0), pt(0, 0), pt(1, 0))).toBeCloseTo(1);
  });
});

describe("segmentIntersection", () => {
  it("finds intersection of crossing segments", () => {
    const p = segmentIntersection(pt(0, 0), pt(1, 1), pt(0, 1), pt(1, 0));
    expect(p).not.toBeNull();
    expect(p!.x).toBeCloseTo(0.5);
    expect(p!.y).toBeCloseTo(0.5);
  });
  it("returns null for parallel segments", () => {
    expect(segmentIntersection(pt(0, 0), pt(1, 0), pt(0, 1), pt(1, 1))).toBeNull();
  });
  it("returns null for non-crossing T segments", () => {
    // Segments that share an endpoint region but don't cross
    expect(segmentIntersection(pt(0, 0), pt(0.5, 0), pt(0.6, 0), pt(1, 0))).toBeNull();
  });
});

describe("constrainAngle", () => {
  it("snaps to 0 degrees (horizontal) when close", () => {
    const origin = pt(0, 0);
    const pt1 = pt(1, 0.01); // almost horizontal
    const result = constrainAngle(origin, pt1, 45);
    expect(result.y).toBeCloseTo(0, 3);
  });
  it("snaps to 90 degrees (vertical) when close", () => {
    const origin = pt(0, 0);
    const pt1 = pt(0.01, 1);
    const result = constrainAngle(origin, pt1, 45);
    expect(result.x).toBeCloseTo(0, 3);
  });
});

describe("isSelfIntersecting", () => {
  it("returns false for convex polygon", () => {
    const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
    expect(isSelfIntersecting(pts)).toBe(false);
  });
  it("returns true for bow-tie (figure 8) polygon", () => {
    // Two triangles that share a crossing at center
    const pts = [pt(0, 0), pt(1, 1), pt(1, 0), pt(0, 1)];
    expect(isSelfIntersecting(pts)).toBe(true);
  });
  it("returns false for triangle", () => {
    expect(isSelfIntersecting([pt(0, 0), pt(1, 0), pt(0.5, 1)])).toBe(false);
  });
});

describe("isValidNormalizedPoint", () => {
  it("accepts points in [0,1]", () => {
    expect(isValidNormalizedPoint(pt(0, 0))).toBe(true);
    expect(isValidNormalizedPoint(pt(1, 1))).toBe(true);
    expect(isValidNormalizedPoint(pt(0.5, 0.5))).toBe(true);
  });
  it("rejects points outside [0,1]", () => {
    expect(isValidNormalizedPoint(pt(-0.1, 0.5))).toBe(false);
    expect(isValidNormalizedPoint(pt(1.01, 0.5))).toBe(false);
    expect(isValidNormalizedPoint(pt(0.5, -0.001))).toBe(false);
  });
  it("rejects NaN", () => {
    expect(isValidNormalizedPoint(pt(NaN, 0))).toBe(false);
  });
});

describe("validatePolygon", () => {
  it("accepts valid convex polygon", () => {
    const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
    const r = validatePolygon(pts);
    expect(r.valid).toBe(true);
  });
  it("rejects less than 3 points", () => {
    const r = validatePolygon([pt(0, 0), pt(1, 0)]);
    expect(r.valid).toBe(false);
  });
  it("rejects self-intersecting polygon", () => {
    const pts = [pt(0, 0), pt(1, 1), pt(1, 0), pt(0, 1)];
    const r = validatePolygon(pts);
    expect(r.valid).toBe(false);
  });
  it("rejects out-of-range points", () => {
    const pts = [pt(-0.1, 0), pt(1, 0), pt(0.5, 1)];
    const r = validatePolygon(pts);
    expect(r.valid).toBe(false);
  });
});
