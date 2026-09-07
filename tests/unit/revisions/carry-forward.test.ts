import { describe, it, expect } from "vitest";
import {
  transformNormalizedPoint,
  transformNormalizedBounds,
  isInBounds,
  calibrationCompatible,
} from "@/lib/revisions/carry-forward";
import { IDENTITY_MATRIX, type AffineMatrix } from "@/lib/revisions/matrices";

describe("transformNormalizedPoint", () => {
  it("identity leaves point unchanged", () => {
    const pt = { x: 0.4, y: 0.6 };
    const result = transformNormalizedPoint(pt, IDENTITY_MATRIX);
    expect(result.x).toBeCloseTo(0.4);
    expect(result.y).toBeCloseTo(0.6);
  });

  it("translation moves point", () => {
    const T: AffineMatrix = [1, 0, 0.1, 0, 1, 0.2, 0, 0, 1];
    const result = transformNormalizedPoint({ x: 0.3, y: 0.3 }, T);
    expect(result.x).toBeCloseTo(0.4);
    expect(result.y).toBeCloseTo(0.5);
  });
});

describe("transformNormalizedBounds", () => {
  it("identity leaves bounds unchanged", () => {
    const bounds = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    const result = transformNormalizedBounds(bounds, IDENTITY_MATRIX);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.2);
    expect(result.width).toBeCloseTo(0.3);
    expect(result.height).toBeCloseTo(0.4);
  });

  it("returns AABB (non-negative width/height) after a flip", () => {
    // 180° flip around center
    const flip: AffineMatrix = [-1, 0, 1, 0, -1, 1, 0, 0, 1];
    const bounds = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
    const result = transformNormalizedBounds(bounds, flip);
    expect(result.width).toBeGreaterThanOrEqual(0);
    expect(result.height).toBeGreaterThanOrEqual(0);
  });
});

describe("isInBounds", () => {
  it("returns true for bounds inside [0,1]x[0,1]", () => {
    expect(isInBounds({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 })).toBe(true);
    expect(isInBounds({ x: 0, y: 0, width: 1, height: 1 })).toBe(true);
  });

  it("returns false when bounds extend outside [0,1]", () => {
    expect(isInBounds({ x: -0.1, y: 0, width: 0.5, height: 0.5 })).toBe(false);
    expect(isInBounds({ x: 0, y: 0, width: 1.1, height: 0.5 })).toBe(false);
    expect(isInBounds({ x: 0.5, y: 0.5, width: 0.6, height: 0.4 })).toBe(false);
  });
});

describe("calibrationCompatible", () => {
  it("returns true when calibrations match within 1%", () => {
    const cal1 = { pageUnitsPerMillimeter: 10.0 };
    const cal2 = { pageUnitsPerMillimeter: 10.05 };
    expect(calibrationCompatible(cal1, cal2)).toBe(true);
  });

  it("returns false when calibrations differ by more than 1%", () => {
    const cal1 = { pageUnitsPerMillimeter: 10.0 };
    const cal2 = { pageUnitsPerMillimeter: 10.2 };
    expect(calibrationCompatible(cal1, cal2)).toBe(false);
  });

  it("returns true for identical values", () => {
    const cal = { pageUnitsPerMillimeter: 5.5 };
    expect(calibrationCompatible(cal, cal)).toBe(true);
  });

  it("returns false when newCalib is null", () => {
    const cal1 = { pageUnitsPerMillimeter: 10.0 };
    expect(calibrationCompatible(cal1, null)).toBe(false);
  });
});
