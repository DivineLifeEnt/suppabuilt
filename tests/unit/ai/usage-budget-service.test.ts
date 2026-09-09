import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/server/db", () => ({
  prisma: {
    aIUsageRecord: { findMany: vi.fn() },
    aIOrganizationPolicy: { findUnique: vi.fn() },
    aIAnalysisRun: { count: vi.fn(), create: vi.fn() },
  },
}));

import { prisma } from "@/server/db";
import { checkBudget, getCurrentMonthUsage } from "@/server/ai/usage-budget-service";

const mockFindMany = prisma.aIUsageRecord.findMany as ReturnType<typeof vi.fn>;
const mockPolicyFindUnique = prisma.aIOrganizationPolicy.findUnique as ReturnType<typeof vi.fn>;
const mockRunCount = prisma.aIAnalysisRun.count as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  mockPolicyFindUnique.mockResolvedValue(null);
  mockRunCount.mockResolvedValue(0);
});

describe("checkBudget", () => {
  it("disallows when no policy is set (budget = 0)", async () => {
    mockPolicyFindUnique.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);
    mockRunCount.mockResolvedValue(0);

    const result = await checkBudget("org-1", 0.05);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("allows when estimated cost is within budget", async () => {
    mockPolicyFindUnique.mockResolvedValue({ monthlyLimitUsd: "10.00" });
    mockFindMany.mockResolvedValue([
      { tokensUsed: 1000, costUsd: "1.00" },
    ]);
    mockRunCount.mockResolvedValue(1);

    const result = await checkBudget("org-1", 0.50);
    expect(result.allowed).toBe(true);
  });

  it("blocks when estimated cost would exceed budget", async () => {
    mockPolicyFindUnique.mockResolvedValue({ monthlyLimitUsd: "5.00" });
    mockFindMany.mockResolvedValue([
      { tokensUsed: 10000, costUsd: "4.80" },
    ]);
    mockRunCount.mockResolvedValue(10);

    const result = await checkBudget("org-1", 0.50);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("exceed");
  });

  it("allows when exactly at budget limit", async () => {
    mockPolicyFindUnique.mockResolvedValue({ monthlyLimitUsd: "5.00" });
    mockFindMany.mockResolvedValue([
      { tokensUsed: 1000, costUsd: "4.95" },
    ]);
    mockRunCount.mockResolvedValue(5);

    const result = await checkBudget("org-1", 0.05);
    expect(result.allowed).toBe(true);
  });
});

describe("getCurrentMonthUsage", () => {
  it("returns zero values when no records exist", async () => {
    mockFindMany.mockResolvedValue([]);
    mockPolicyFindUnique.mockResolvedValue({ monthlyLimitUsd: "10.00" });
    mockRunCount.mockResolvedValue(0);

    const summary = await getCurrentMonthUsage("org-1");
    expect(summary.totalTokens).toBe(0);
    expect(summary.totalCostUsd).toBe(0);
    expect(summary.totalRuns).toBe(0);
    expect(summary.budgetLimitUsd).toBe(10);
    expect(summary.remainingUsd).toBe(10);
  });

  it("sums tokens and costs correctly", async () => {
    mockFindMany.mockResolvedValue([
      { tokensUsed: 1000, costUsd: "0.01" },
      { tokensUsed: 2000, costUsd: "0.02" },
    ]);
    mockPolicyFindUnique.mockResolvedValue({ monthlyLimitUsd: "5.00" });
    mockRunCount.mockResolvedValue(2);

    const summary = await getCurrentMonthUsage("org-1");
    expect(summary.totalTokens).toBe(3000);
    expect(summary.totalCostUsd).toBeCloseTo(0.03);
    expect(summary.remainingUsd).toBeCloseTo(4.97);
  });

  it("clamps remainingUsd to 0 when over budget", async () => {
    mockFindMany.mockResolvedValue([
      { tokensUsed: 100000, costUsd: "10.00" },
    ]);
    mockPolicyFindUnique.mockResolvedValue({ monthlyLimitUsd: "5.00" });
    mockRunCount.mockResolvedValue(10);

    const summary = await getCurrentMonthUsage("org-1");
    expect(summary.remainingUsd).toBe(0);
  });
});
