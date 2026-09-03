import { describe, it, expect } from "vitest";
import { isLinearUnit, isAreaUnit, mmToQuantityUnit, mm2ToQuantityUnit } from "@/lib/takeoff/units";

describe("isLinearUnit", () => {
  it("identifies linear units", () => {
    expect(isLinearUnit("linear-foot")).toBe(true);
    expect(isLinearUnit("linear-inch")).toBe(true);
    expect(isLinearUnit("linear-meter")).toBe(true);
    expect(isLinearUnit("each")).toBe(false);
    expect(isLinearUnit("square-foot")).toBe(false);
  });
});

describe("isAreaUnit", () => {
  it("identifies area units", () => {
    expect(isAreaUnit("square-foot")).toBe(true);
    expect(isAreaUnit("square-meter")).toBe(true);
    expect(isAreaUnit("linear-foot")).toBe(false);
  });
});

describe("mmToQuantityUnit", () => {
  it("converts mm to linear-foot", () => {
    expect(parseFloat(mmToQuantityUnit(304.8, "linear-foot"))).toBeCloseTo(1, 4);
  });
  it("converts mm to linear-inch", () => {
    expect(parseFloat(mmToQuantityUnit(25.4, "linear-inch"))).toBeCloseTo(1, 4);
  });
  it("converts mm to linear-meter", () => {
    expect(parseFloat(mmToQuantityUnit(1000, "linear-meter"))).toBeCloseTo(1, 4);
  });
  it("throws for non-linear units like each", () => {
    expect(() => mmToQuantityUnit(5000, "each")).toThrow();
  });
});

describe("mm2ToQuantityUnit", () => {
  it("converts mm2 to square-foot", () => {
    // 1 sq ft = 92903.04 mm2
    expect(parseFloat(mm2ToQuantityUnit(92903.04, "square-foot"))).toBeCloseTo(1, 2);
  });
  it("converts mm2 to square-meter", () => {
    expect(parseFloat(mm2ToQuantityUnit(1000000, "square-meter"))).toBeCloseTo(1, 4);
  });
});
