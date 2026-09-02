import { describe, it, expect } from "vitest";
import {
  toMillimeters,
  fromMillimeters,
  toSquareMillimeters,
  fromSquareMillimeters,
  toCubicMillimeters,
  fromCubicMillimeters,
  normalizedToMillimeters,
  normalizedDistance,
} from "@/lib/measurement/units";
import type { Calibration } from "@/lib/measurement/types";
import type { NormalizedPoint } from "@/lib/markup/types";

const pt = (x: number, y: number): NormalizedPoint => ({ x, y });

// Calibration: 1 normalized unit = 1000mm (pageUnitsPerMillimeter = 0.001)
const mockCal: Calibration = {
  id: "cal-1",
  planId: "p1",
  pageNumber: 1,
  name: "Test",
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

describe("linear unit roundtrips", () => {
  const units = ["millimeter", "centimeter", "meter", "inch", "foot"] as const;
  for (const u of units) {
    it(`roundtrips through ${u}`, () => {
      const mm = 1234.5;
      const converted = toMillimeters(fromMillimeters(mm, u), u);
      expect(converted).toBeCloseTo(mm, 6);
    });
  }
});

describe("area unit roundtrips", () => {
  const units = ["square-millimeter", "square-centimeter", "square-meter", "square-inch", "square-foot"] as const;
  for (const u of units) {
    it(`roundtrips through ${u}`, () => {
      const mm2 = 500000;
      const converted = toSquareMillimeters(fromSquareMillimeters(mm2, u), u);
      expect(converted).toBeCloseTo(mm2, 3);
    });
  }
});

describe("volume unit roundtrips", () => {
  const units = ["cubic-millimeter", "cubic-centimeter", "cubic-meter", "cubic-inch", "cubic-foot"] as const;
  for (const u of units) {
    it(`roundtrips through ${u}`, () => {
      const mm3 = 1e9;
      const converted = toCubicMillimeters(fromCubicMillimeters(mm3, u), u);
      expect(converted).toBeCloseTo(mm3, 0);
    });
  }
});

describe("normalizedToMillimeters", () => {
  it("converts normalized distance using calibration", () => {
    // pageUnitsPerMillimeter = 0.001 → 1 normalized unit = 1000mm
    expect(normalizedToMillimeters(1, mockCal)).toBeCloseTo(1000);
  });

  it("scales proportionally", () => {
    expect(normalizedToMillimeters(0.5, mockCal)).toBeCloseTo(500);
  });

  it("returns 0 for zero distance", () => {
    expect(normalizedToMillimeters(0, mockCal)).toBe(0);
  });
});

describe("normalizedDistance", () => {
  it("computes distance between two normalized points", () => {
    expect(normalizedDistance(pt(0, 0), pt(0.3, 0.4))).toBeCloseTo(0.5);
  });
  it("returns 0 for same point", () => {
    expect(normalizedDistance(pt(0.5, 0.5), pt(0.5, 0.5))).toBe(0);
  });
  it("horizontal unit distance", () => {
    expect(normalizedDistance(pt(0, 0), pt(1, 0))).toBeCloseTo(1);
  });
});

describe("unit conversions spot checks", () => {
  it("1 foot = 304.8 mm", () => {
    expect(toMillimeters(1, "foot")).toBeCloseTo(304.8);
  });
  it("1 inch = 25.4 mm", () => {
    expect(toMillimeters(1, "inch")).toBeCloseTo(25.4);
  });
  it("1 m = 1000 mm", () => {
    expect(toMillimeters(1, "meter")).toBeCloseTo(1000);
  });
  it("1 square foot ≈ 92903 mm²", () => {
    expect(toSquareMillimeters(1, "square-foot")).toBeCloseTo(92903.04, 0);
  });
  it("1 cubic foot ≈ 28316846 mm³", () => {
    expect(toCubicMillimeters(1, "cubic-foot")).toBeCloseTo(28316846.6, 0);
  });
});
