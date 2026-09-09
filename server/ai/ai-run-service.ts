import { prisma } from "@/server/db";
import type { AIAnalysisRun } from "@/lib/ai/types";
import { checkBudget } from "./usage-budget-service";

const ESTIMATED_COST_PER_PAGE = 0.05; // $0.05 per page estimate

function mapRun(run: {
  id: string;
  sessionId: string;
  orgId: string;
  pageIds: string[];
  providerName: string;
  modelVersion: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  suggestionsCount: number;
  tokensUsed: number;
  estimatedCostUsd: unknown;
  createdAt: Date;
  updatedAt: Date;
}): AIAnalysisRun {
  return {
    id: run.id,
    sessionId: run.sessionId,
    orgId: run.orgId,
    pageIds: run.pageIds,
    providerName: run.providerName,
    modelVersion: run.modelVersion,
    status: run.status as AIAnalysisRun["status"],
    startedAt: run.startedAt ?? undefined,
    completedAt: run.completedAt ?? undefined,
    errorMessage: run.errorMessage ?? undefined,
    suggestionsCount: run.suggestionsCount,
    tokensUsed: run.tokensUsed,
    estimatedCostUsd: Number(run.estimatedCostUsd),
  };
}

export async function createRun(
  orgId: string,
  sessionId: string,
  pageIds: string[]
): Promise<AIAnalysisRun> {
  const estimatedCostUsd = pageIds.length * ESTIMATED_COST_PER_PAGE;

  const budgetCheck = await checkBudget(orgId, estimatedCostUsd);
  if (!budgetCheck.allowed) {
    const err = Object.assign(new Error(budgetCheck.reason ?? "Budget exceeded"), {
      code: "BUDGET_EXCEEDED",
    });
    throw err;
  }

  const run = await prisma.aIAnalysisRun.create({
    data: {
      sessionId,
      orgId,
      pageIds,
      providerName: "fake",
      modelVersion: "1.0",
      status: "queued",
      estimatedCostUsd,
    },
  });

  return mapRun(run);
}

export async function getRunStatus(runId: string): Promise<AIAnalysisRun> {
  const run = await prisma.aIAnalysisRun.findUnique({ where: { id: runId } });
  if (!run) throw Object.assign(new Error(`Run not found: ${runId}`), { code: "NOT_FOUND" });
  return mapRun(run);
}

export async function listRunsForSession(sessionId: string): Promise<AIAnalysisRun[]> {
  const runs = await prisma.aIAnalysisRun.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });
  return runs.map(mapRun);
}

export async function cancelRun(runId: string): Promise<void> {
  const run = await prisma.aIAnalysisRun.findUnique({ where: { id: runId } });
  if (!run) throw Object.assign(new Error(`Run not found: ${runId}`), { code: "NOT_FOUND" });

  if (run.status === "completed" || run.status === "failed") {
    throw Object.assign(new Error(`Cannot cancel run in status: ${run.status}`), {
      code: "INVALID_STATE",
    });
  }

  await prisma.aIAnalysisRun.update({
    where: { id: runId },
    data: { status: "cancelled", completedAt: new Date() },
  });
}
