import { describe, it, expect } from "vitest";
import { formatArchitectural } from "@/lib/measurement/architectural-format";

describe("formatArchitectural", () => {
  it("formats 0 feet as 0\"", () => {
    expect(formatArchitectural(0, 8)).toBe('0"');
  });

  it("formats 1 foot as 1'-0\"", () => {
    expect(formatArchitectural(1, 8)).toBe("1'-0\"");
  });

  it("formats 3.375 feet as 3'-4 1/2\"", () => {
    // 3.375 ft = 3 ft + 4.5 in → 3'-4 1/2"
    expect(formatArchitectural(3.375, 8)).toBe("3'-4 1/2\"");
  });

  it("formats 0.0625 feet as 3/4\" using denom 16", () => {
    // 0.0625 ft = 0.75 in = 3/4"
    expect(formatArchitectural(0.0625, 16)).toBe('3/4"');
  });

  it("formats whole feet only when no inch remainder", () => {
    expect(formatArchitectural(5, 8)).toBe("5'-0\"");
  });

  it("formats fractional inches with denom 2", () => {
    // 0.5 ft = 6 in → 6"
    expect(formatArchitectural(0.5, 2)).toBe('6"');
  });

  it("formats 2.5 ft as 2'-6\"", () => {
    expect(formatArchitectural(2.5, 8)).toBe("2'-6\"");
  });

  it("uses correct denominator 64 for fine fractions", () => {
    // 0.25/12 = 1/48 ft ≈ 0.00208... ft → very small inches
    // 1/64 in = 0.015625 in → 0.00130 ft, but let's test something simpler
    const val = 1 + 1 / 12 / 64; // 1 ft + 1/64 inch
    const result = formatArchitectural(val, 64);
    expect(result).toContain("1'-");
    expect(result).toContain("1/64");
  });
});
