import { describe, it, expect } from "vitest";
import {
  parseDecimal,
  formatDecimal,
  addDecimal,
  subtractDecimal,
  multiplyDecimal,
  divideDecimal,
  calculateGrossQuantity,
} from "@/lib/takeoff/decimal";

describe("parseDecimal / formatDecimal round-trip", () => {
  it("round-trips integers", () => {
    expect(formatDecimal(parseDecimal("42"))).toBe("42.000000");
  });
  it("round-trips decimals", () => {
    expect(formatDecimal(parseDecimal("3.14159"))).toBe("3.141590");
  });
  it("round-trips zero", () => {
    expect(formatDecimal(parseDecimal("0"))).toBe("0.000000");
  });
  it("handles negative", () => {
    expect(formatDecimal(parseDecimal("-1.5"))).toBe("-1.500000");
  });
});

describe("addDecimal", () => {
  it("adds two decimals", () => {
    expect(addDecimal("1.1", "2.2")).toBe("3.300000");
  });
  it("adds zero", () => {
    expect(addDecimal("5", "0")).toBe("5.000000");
  });
});

describe("subtractDecimal", () => {
  it("subtracts correctly", () => {
    expect(subtractDecimal("10", "3.5")).toBe("6.500000");
  });
});

describe("multiplyDecimal", () => {
  it("multiplies correctly", () => {
    expect(multiplyDecimal("2.5", "4")).toBe("10.000000");
  });
  it("multiplies by zero", () => {
    expect(multiplyDecimal("999", "0")).toBe("0.000000");
  });
});

describe("divideDecimal", () => {
  it("divides correctly", () => {
    expect(divideDecimal("10", "4")).toBe("2.500000");
  });
  it("throws on divide by zero", () => {
    expect(() => divideDecimal("10", "0")).toThrow();
  });
});

describe("calculateGrossQuantity", () => {
  it("10% waste on 100 => 110", () => {
    expect(parseFloat(calculateGrossQuantity("100", "10"))).toBeCloseTo(110, 4);
  });
  it("0% waste => same as net", () => {
    expect(parseFloat(calculateGrossQuantity("50", "0"))).toBeCloseTo(50, 4);
  });
  it("5% waste on 20 => 21", () => {
    expect(parseFloat(calculateGrossQuantity("20", "5"))).toBeCloseTo(21, 4);
  });
});
