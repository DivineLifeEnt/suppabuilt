import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIEnabled } from "@/server/ai/ai-policy-service";
import { getRunStatus, cancelRun } from "@/server/ai/ai-run-service";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Params = { params: Promise<{ runId: string }> };

// GET /api/ai/runs/[runId]
export async function GET(_request: Request, { params }: Params) {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  try { await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  const { runId } = await params;

  try {
    const run = await getRunStatus(runId);
    return NextResponse.json({ run });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") return apiError("NOT_FOUND", e.message, 404);
    return apiError("INTERNAL", "Failed to get run status", 500);
  }
}

// DELETE /api/ai/runs/[runId]
export async function DELETE(_request: Request, { params }: Params) {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  try { await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  const { runId } = await params;

  try {
    await cancelRun(runId);
    return NextResponse.json({ cancelled: runId });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") return apiError("NOT_FOUND", e.message, 404);
    if (e.code === "INVALID_STATE") return apiError("INVALID_STATE", e.message, 409);
    return apiError("INTERNAL", "Failed to cancel run", 500);
  }
}
