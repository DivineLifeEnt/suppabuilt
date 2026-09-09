import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIEnabled } from "@/server/ai/ai-policy-service";
import { rejectSuggestion } from "@/server/ai/suggestion-review-service";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Params = { params: Promise<{ suggestionId: string }> };

// POST /api/ai/suggestions/[suggestionId]/reject
export async function POST(_request: Request, { params }: Params) {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  let user;
  try { user = await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  const { suggestionId } = await params;

  try {
    const suggestion = await rejectSuggestion(suggestionId, user.userId);
    return NextResponse.json({ suggestion });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") return apiError("NOT_FOUND", e.message, 404);
    console.error(err);
    return apiError("INTERNAL", "Failed to reject suggestion", 500);
  }
}
