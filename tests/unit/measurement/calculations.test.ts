import { describe, it, expect } from "vitest";
import {
  calculateLinearMm,
  calculatePolylineMm,
  calculatePerimeterMm,
  calculateAreaMm2,
  calculateVolumeMm3,
  calculateAngleDeg,
} from "@/lib/measurement/calculations";
import type { Calibration } from "@/lib/measurement/types";
import type { NormalizedPoint } from "@/lib/markup/types";

const pt = (x: number, y: number): NormalizedPoint => ({ x, y });

// Calibration: 1 normalized unit = 1000mm (pageUnitsPerMillimeter = 0.001)
const cal: Calibration = {
  id: "c1",
  planId: "p1",
  pageNumber: 1,
  name: "Test scale",
  normalizedStart: pt(0, 0),
  normalizedEnd: pt(1, 0),
  knownDistanceMillimeters: 1000,
  pageUnitsPerMillimeter: 0.001,
  unitSystem: "imperial-architectural",
  displayUnit: "foot",
  precision: 2,
  revision: 1,
  createdBy: { name: "Test" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("calculateLinearMm", () => {
  it("computes horizontal linear distance", () => {
    // 0.5 normalized = 500mm
    expect(calculateLinearMm(pt(0, 0), pt(0.5, 0), cal)).toBeCloseTo(500);
  });

  it("computes diagonal distance", () => {
    // distance(0,0 → 0.3,0.4) = 0.5 normalized = 500mm
    expect(calculateLinearMm(pt(0, 0), pt(0.3, 0.4), cal)).toBeCloseTo(500);
  });

  it("returns 0 for same point", () => {
    expect(calculateLinearMm(pt(0.5, 0.5), pt(0.5, 0.5), cal)).toBe(0);
  });
});

describe("calculatePolylineMm", () => {
  it("sums segment distances", () => {
    // 0.5 + 0.5 = 1.0 normalized = 1000mm
    expect(
      calculatePolylineMm([pt(0, 0), pt(0.5, 0), pt(0.5, 0.5)], cal)
    ).toBeCloseTo(1000);
  });

  it("returns 0 for single point", () => {
    expect(calculatePolylineMm([pt(0.5, 0.5)], cal)).toBe(0);
  });
});

describe("calculatePerimeterMm", () => {
  it("includes closing segment", () => {
    // sides: 1, 1, sqrt(2) = (2+sqrt(2)) normalized = (2+sqrt(2))*1000mm
    expect(
      calculatePerimeterMm([pt(0, 0), pt(1, 0), pt(1, 1)], cal)
    ).toBeCloseTo((2 + Math.SQRT2) * 1000, 0);
  });
});

describe("calculateAreaMm2", () => {
  it("computes polygon area (unit square)", () => {
    const geo = { kind: "polygon" as const, points: [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)] };
    // Area = 1 normalized² = 1 / (0.001²) mm² = 1e6 mm²
    expect(calculateAreaMm2(geo, cal)).toBeCloseTo(1e6, -2);
  });

  it("computes bounds area", () => {
    const geo = { kind: "bounds" as const, bounds: { x: 0, y: 0, width: 0.5, height: 0.5 }, rotation: 0 };
    // 0.25 normalized² = 0.25 / 1e-6 mm² = 250000 mm²
    expect(calculateAreaMm2(geo, cal)).toBeCloseTo(250000, -2);
  });
});

describe("calculateVolumeMm3", () => {
  it("computes volume as area * depth", () => {
    const geo = { kind: "polygon" as const, points: [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)] };
    // area = 1e6 mm², depth = 100mm → volume = 1e8 mm³
    expect(calculateVolumeMm3(geo, 100, cal)).toBeCloseTo(1e8, -3);
  });
});

describe("calculateAngleDeg", () => {
  it("computes 90 degree angle", () => {
    // vertex at center, one arm right, one arm down
    const deg = calculateAngleDeg(pt(0.5, 0.5), pt(1, 0.5), pt(0.5, 1));
    expect(deg).toBeCloseTo(90, 0);
  });

  it("computes 180 degree angle for collinear points", () => {
    const deg = calculateAngleDeg(pt(0.5, 0.5), pt(0, 0.5), pt(1, 0.5));
    expect(deg).toBeCloseTo(180, 0);
  });
});
