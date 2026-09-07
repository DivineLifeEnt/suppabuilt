import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration tests for estimating service layer (unit-level, not http-level)

vi.mock("@/server/db", () => ({
  prisma: {
    estimateLine: { findMany: vi.fn() },
    estimateVersionAdjustment: { findMany: vi.fn() },
    estimateVersion: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/server/db";
import { CalculationService } from "@/server/estimating/calculation-service";

const mockVersion = { currency: "USD", id: "ver_test" };

describe("CalculationService.calculateVersionTotals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.estimateVersion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersion);
  });

  it("returns near-zero totals for empty version", async () => {
    (prisma.estimateLine.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.estimateVersionAdjustment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const service = new CalculationService();
    const totals = await service.calculateVersionTotals("ver_test");

    expect(parseFloat(totals.totalDirectCost.amount)).toBe(0);
    expect(parseFloat(totals.finalTotal.amount)).toBe(0);
    expect(totals.currency).toBe("USD");
  });

  it("sums only the lines that the DB returns (mock returns included lines only)", async () => {
    // The service queries with { included: true }; mock returns only included lines
    (prisma.estimateLine.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "l1", included: true, quantity: "10", wastePercent: "0",
        unitMaterialCost: "5", laborHoursPerUnit: "0", burdenedLaborRate: "0",
        unitEquipmentCost: "0", unitSubcontractCost: "0", unitOtherCost: "0",
        currency: "USD", category: "material", unit: "each",
      },
    ]);
    (prisma.estimateVersionAdjustment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const service = new CalculationService();
    const totals = await service.calculateVersionTotals("ver_test");

    // l1: 10 * 5 = 50
    expect(parseFloat(totals.totalDirectCost.amount)).toBeCloseTo(50, 1);
  });
});

describe("estimate status workflow", () => {
  it("draft → in-review → approved is valid progression", () => {
    const validTransitions: Array<[string, string]> = [
      ["draft", "in-review"],
      ["in-review", "approved"],
      ["in-review", "changes-requested"],
      ["changes-requested", "draft"],
      ["approved", "locked"],
      ["approved", "superseded"],
    ];
    for (const [from, to] of validTransitions) {
      expect(isValidTransition(from, to)).toBe(true);
    }
  });

  it("cannot go from locked to draft", () => {
    expect(isValidTransition("locked", "draft")).toBe(false);
  });

  it("cannot go from approved to in-review", () => {
    expect(isValidTransition("approved", "in-review")).toBe(false);
  });
});

function isValidTransition(from: string, to: string): boolean {
  const ALLOWED: Record<string, string[]> = {
    draft: ["in-review"],
    "in-review": ["approved", "changes-requested"],
    "changes-requested": ["draft"],
    approved: ["locked", "superseded"],
    locked: ["archived"],
    superseded: [],
    archived: [],
  };
  return (ALLOWED[from] ?? []).includes(to);
}
