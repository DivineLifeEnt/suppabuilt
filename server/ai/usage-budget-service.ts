import { prisma } from "@/server/db";
import type { AIUsageSummary } from "@/lib/ai/types";

export async function getCurrentMonthUsage(orgId: string): Promise<AIUsageSummary> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [records, policy, runsCount] = await Promise.all([
    prisma.aIUsageRecord.findMany({
      where: {
        orgId,
        recordedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.aIOrganizationPolicy.findUnique({ where: { orgId } }),
    prisma.aIAnalysisRun.count({
      where: {
        orgId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);

  const totalTokens = records.reduce((sum: number, r: { tokensUsed: number }) => sum + r.tokensUsed, 0);
  const totalCostUsd = records.reduce((sum: number, r: { costUsd: unknown }) => sum + Number(r.costUsd), 0);
  const budgetLimitUsd = policy ? Number(policy.monthlyLimitUsd) : 0;

  return {
    orgId,
    periodStart,
    periodEnd,
    totalRuns: runsCount,
    totalTokens,
    totalCostUsd,
    budgetLimitUsd,
    remainingUsd: Math.max(0, budgetLimitUsd - totalCostUsd),
  };
}

export async function checkBudget(
  orgId: string,
  estimatedCostUsd: number
): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getCurrentMonthUsage(orgId);

  if (usage.budgetLimitUsd === 0) {
    // No budget set — disallow by default
    return { allowed: false, reason: "No AI budget configured for this organization" };
  }

  const projectedTotal = usage.totalCostUsd + estimatedCostUsd;
  if (projectedTotal > usage.budgetLimitUsd) {
    return {
      allowed: false,
      reason: `Estimated cost $${estimatedCostUsd.toFixed(2)} would exceed monthly budget limit of $${usage.budgetLimitUsd.toFixed(2)} (current usage: $${usage.totalCostUsd.toFixed(2)})`,
    };
  }

  return { allowed: true };
}

export async function recordUsage(
  runId: string,
  orgId: string,
  tokensUsed: number,
  costUsd: number
): Promise<void> {
  await prisma.aIUsageRecord.create({
    data: { runId, orgId, tokensUsed, costUsd },
  });
}
