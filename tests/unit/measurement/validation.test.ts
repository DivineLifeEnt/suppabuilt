import { describe, it, expect } from "vitest";
import {
  validateCalibration,
  validateLinear,
  validatePolyline,
  validateArea,
} from "@/lib/measurement/validation";
import type { NormalizedPoint } from "@/lib/markup/types";

const pt = (x: number, y: number): NormalizedPoint => ({ x, y });

describe("validateCalibration", () => {
  it("accepts valid calibration", () => {
    const r = validateCalibration(pt(0, 0), pt(0.5, 0), 1000);
    expect(r.valid).toBe(true);
  });

  it("rejects zero-length segment", () => {
    const r = validateCalibration(pt(0.5, 0.5), pt(0.5, 0.5), 1000);
    expect(r.valid).toBe(false);
    expect(r.valid ? "" : r.error).toMatch(/zero/i);
  });

  it("rejects non-positive known distance", () => {
    const r = validateCalibration(pt(0, 0), pt(1, 0), 0);
    expect(r.valid).toBe(false);
  });

  it("rejects negative distance", () => {
    const r = validateCalibration(pt(0, 0), pt(1, 0), -5);
    expect(r.valid).toBe(false);
  });

  it("rejects out-of-range start point", () => {
    const r = validateCalibration(pt(-0.1, 0), pt(1, 0), 100);
    expect(r.valid).toBe(false);
  });

  it("rejects non-finite distance", () => {
    const r = validateCalibration(pt(0, 0), pt(1, 0), Infinity);
    expect(r.valid).toBe(false);
  });

  it("rejects NaN distance", () => {
    const r = validateCalibration(pt(0, 0), pt(1, 0), NaN);
    expect(r.valid).toBe(false);
  });
});

describe("validateLinear", () => {
  it("accepts valid two-point linear", () => {
    const r = validateLinear(pt(0, 0), pt(0.5, 0.5));
    expect(r.valid).toBe(true);
  });

  it("rejects same point (zero length)", () => {
    const r = validateLinear(pt(0.5, 0.5), pt(0.5, 0.5));
    expect(r.valid).toBe(false);
  });

  it("rejects out-of-range end point", () => {
    const r = validateLinear(pt(0, 0), pt(1.5, 0));
    expect(r.valid).toBe(false);
  });
});

describe("validatePolyline", () => {
  it("accepts valid polyline with 3 distinct points", () => {
    const r = validatePolyline([pt(0, 0), pt(0.5, 0), pt(0.5, 0.5)]);
    expect(r.valid).toBe(true);
  });

  it("rejects consecutive duplicates", () => {
    const r = validatePolyline([pt(0, 0), pt(0, 0), pt(0.5, 0.5)]);
    expect(r.valid).toBe(false);
    expect(r.valid ? "" : r.error).toMatch(/duplicate/i);
  });

  it("rejects single point", () => {
    const r = validatePolyline([pt(0, 0)]);
    expect(r.valid).toBe(false);
  });

  it("rejects empty array", () => {
    const r = validatePolyline([]);
    expect(r.valid).toBe(false);
  });
});

describe("validateArea", () => {
  it("accepts valid convex polygon", () => {
    const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
    const r = validateArea(pts);
    expect(r.valid).toBe(true);
  });

  it("rejects less than 3 points", () => {
    const r = validateArea([pt(0, 0), pt(1, 0)]);
    expect(r.valid).toBe(false);
  });

  it("rejects self-intersecting polygon", () => {
    // Bow-tie shape
    const pts = [pt(0, 0), pt(1, 1), pt(1, 0), pt(0, 1)];
    const r = validateArea(pts);
    expect(r.valid).toBe(false);
    expect(r.valid ? "" : r.error).toMatch(/self.intersect/i);
  });

  it("rejects out-of-range points", () => {
    const pts = [pt(-0.1, 0), pt(1, 0), pt(0.5, 1)];
    const r = validateArea(pts);
    expect(r.valid).toBe(false);
  });
});
