import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIEnabled } from "@/server/ai/ai-policy-service";
import { createRun } from "@/server/ai/ai-run-service";
import { runAIAnalysis } from "@/server/ai/ai-job-runner";
import { buildFakeProviders } from "@/server/ai/providers/fake-provider";
import { CreateAIRunSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /api/ai/runs — create a run
export async function POST(request: Request) {
  if (!isAIEnabled()) {
    return apiError("AI_DISABLED", "AI analysis is not enabled", 403);
  }

  let user;
  try {
    user = await requireAuth();
  } catch {
    return apiError("UNAUTHENTICATED", "Authentication required", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = CreateAIRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid input", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { sessionId, pageIds } = parsed.data;

  try {
    const run = await createRun(user.orgId, sessionId, pageIds);

    // Fire-and-forget: run AI analysis in background
    const providers = buildFakeProviders();
    runAIAnalysis(run.id, providers).catch((err: Error) => {
      console.error(`AI run ${run.id} failed:`, err.message);
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "BUDGET_EXCEEDED") {
      return apiError("BUDGET_EXCEEDED", e.message, 402);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to create AI run", 500);
  }
}
