import { describe, it, expect } from "vitest";
import { applyAssemblyRule, validateAssemblyRule } from "@/lib/takeoff/calculations";
import type { AssemblyRule } from "@/lib/takeoff/types";

describe("applyAssemblyRule — fixed", () => {
  it("returns fixed quantity", () => {
    const rule: AssemblyRule = { kind: "fixed", quantity: "3" };
    expect(parseFloat(applyAssemblyRule(rule, {}))).toBeCloseTo(3, 4);
  });
});

describe("applyAssemblyRule — multiply-by-source-count", () => {
  it("multiplies count by factor", () => {
    const rule: AssemblyRule = { kind: "multiply-by-source-count", factor: "2.5" };
    expect(parseFloat(applyAssemblyRule(rule, { sourceCount: 4 }))).toBeCloseTo(10, 4);
  });
  it("defaults sourceCount to 1", () => {
    const rule: AssemblyRule = { kind: "multiply-by-source-count", factor: "2" };
    expect(parseFloat(applyAssemblyRule(rule, {}))).toBeCloseTo(2, 4);
  });
});

describe("applyAssemblyRule — multiply-length-by-factor", () => {
  it("converts mm to feet then multiplies", () => {
    // 3048 mm = 10 ft; factor 1.1 => 11 ft
    const rule: AssemblyRule = { kind: "multiply-length-by-factor", factor: "1.1" };
    expect(parseFloat(applyAssemblyRule(rule, { sourceLengthMm: 3048 }))).toBeCloseTo(11, 2);
  });
});

describe("applyAssemblyRule — ceiling-length-divided-by-spacing", () => {
  it("computes ceiling count for hangers", () => {
    // 10 ft span, 4 ft spacing => ceil(10/4) = 3
    const rule: AssemblyRule = { kind: "ceiling-length-divided-by-spacing", spacingFeet: "4" };
    expect(parseFloat(applyAssemblyRule(rule, { sourceLengthMm: 3048 }))).toBe(3);
  });
});

describe("applyAssemblyRule — conditional", () => {
  it("picks thenQuantity when field matches", () => {
    const rule: AssemblyRule = { kind: "conditional", field: "material", equals: "copper", thenQuantity: "5", elseQuantity: "2" };
    expect(parseFloat(applyAssemblyRule(rule, { itemFields: { material: "copper" } }))).toBeCloseTo(5, 4);
  });
  it("picks elseQuantity when field does not match", () => {
    const rule: AssemblyRule = { kind: "conditional", field: "material", equals: "copper", thenQuantity: "5", elseQuantity: "2" };
    expect(parseFloat(applyAssemblyRule(rule, { itemFields: { material: "steel" } }))).toBeCloseTo(2, 4);
  });
});

describe("validateAssemblyRule", () => {
  it("validates a valid rule", () => {
    expect(validateAssemblyRule({ kind: "fixed", quantity: "1" }).valid).toBe(true);
  });
  it("rejects zero spacing", () => {
    const result = validateAssemblyRule({ kind: "ceiling-length-divided-by-spacing", spacingFeet: "0" });
    expect(result.valid).toBe(false);
  });
});
