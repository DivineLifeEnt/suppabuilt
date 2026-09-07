import { describe, it, expect } from "vitest";
import {
  calculateGrossQuantity,
  calculateMaterialCost,
  calculateLaborHours,
  calculateLaborCost,
  calculateMarkup,
  calculateMargin,
  MarginRateError,
  calculateDirectCost,
  calculateLineTotals,
} from "@/lib/estimating/calculations";

// EstimateLineInput has no description/category/currency/included — those are on EstimateLine
const BASE_INPUT = {
  quantity: "10",
  unit: "each" as const,
  wastePercent: "0",
  unitMaterialCost: "5",
  laborHoursPerUnit: "0",
  burdenedLaborRate: "0",
  unitEquipmentCost: "0",
  unitSubcontractCost: "0",
  unitOtherCost: "0",
};

describe("calculateGrossQuantity", () => {
  it("applies no waste when 0%", () => {
    const result = calculateGrossQuantity("10", "0");
    expect(parseFloat(result)).toBeCloseTo(10, 5);
  });

  it("applies 10% waste", () => {
    const result = calculateGrossQuantity("10", "10");
    expect(parseFloat(result)).toBeCloseTo(11, 5);
  });

  it("rounds to at least 4dp of precision", () => {
    const result = calculateGrossQuantity("1", "3");
    expect(parseFloat(result)).toBeCloseTo(1.03, 5);
  });
});

describe("calculateMaterialCost", () => {
  it("multiplies gross qty by unit cost", () => {
    const grossQty = calculateGrossQuantity("10", "0");
    const result = calculateMaterialCost(grossQty, "5", "USD");
    expect(parseFloat(result.amount)).toBeCloseTo(50, 5);
    expect(result.currency).toBe("USD");
  });

  it("includes waste in gross qty", () => {
    const grossQty = calculateGrossQuantity("10", "10");
    const result = calculateMaterialCost(grossQty, "5", "USD");
    expect(parseFloat(result.amount)).toBeCloseTo(55, 5);
  });
});

describe("calculateLaborHours", () => {
  it("multiplies qty by hours per unit", () => {
    expect(parseFloat(calculateLaborHours("10", "2"))).toBeCloseTo(20, 5);
  });
});

describe("calculateLaborCost", () => {
  it("multiplies hours by rate", () => {
    const hours = calculateLaborHours("10", "2");
    const result = calculateLaborCost(hours, "50", "USD");
    expect(parseFloat(result.amount)).toBeCloseTo(1000, 5);
  });
});

describe("calculateMarkup", () => {
  it("returns correct markup amount (20% of 100 = 20)", () => {
    const cost = { amount: "100", currency: "USD" };
    const adj = calculateMarkup(cost, "0.2");
    expect(parseFloat(adj.amount)).toBeCloseTo(20, 4);
  });
});

describe("calculateMargin", () => {
  it("returns correct margin amount (20% margin on cost=80 → sell=100, margin=20)", () => {
    const cost = { amount: "80", currency: "USD" };
    const adj = calculateMargin(cost, "0.2");
    expect(parseFloat(adj.amount)).toBeCloseTo(20, 4);
  });

  it("throws MarginRateError for rate >= 1", () => {
    expect(() => calculateMargin({ amount: "100", currency: "USD" }, "1")).toThrow(MarginRateError);
  });

  it("throws MarginRateError for negative rate", () => {
    expect(() => calculateMargin({ amount: "100", currency: "USD" }, "-0.1")).toThrow(MarginRateError);
  });
});

describe("calculateDirectCost", () => {
  it("sums all cost components", () => {
    const result = calculateDirectCost(
      { amount: "50", currency: "USD" },
      { amount: "30", currency: "USD" },
      { amount: "10", currency: "USD" },
      { amount: "5", currency: "USD" },
      { amount: "5", currency: "USD" },
    );
    expect(parseFloat(result.amount)).toBeCloseTo(100, 5);
  });
});

describe("calculateLineTotals", () => {
  it("computes totals for a basic material line", () => {
    const result = calculateLineTotals(BASE_INPUT, "USD");
    expect(parseFloat(result.materialCost.amount)).toBeCloseTo(50, 5);
    expect(parseFloat(result.directCost.amount)).toBeCloseTo(50, 5);
  });

  it("handles zero quantities", () => {
    const line = { ...BASE_INPUT, quantity: "0" };
    const result = calculateLineTotals(line, "USD");
    expect(parseFloat(result.directCost.amount)).toBe(0);
    expect(result.directCost.currency).toBe("USD");
  });

  it("applies waste percent correctly", () => {
    const line = { ...BASE_INPUT, quantity: "10", wastePercent: "10" };
    const result = calculateLineTotals(line, "USD");
    // gross qty = 11, material = 11 * 5 = 55
    expect(parseFloat(result.materialCost.amount)).toBeCloseTo(55, 5);
  });
});
