import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIEnabled } from "@/server/ai/ai-policy-service";
import { getSuggestionsForSession } from "@/server/ai/suggestion-review-service";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Params = { params: Promise<{ sessionId: string }> };

// GET /api/ai/sessions/[sessionId]/suggestions
export async function GET(_request: Request, { params }: Params) {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  try { await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  const { sessionId } = await params;

  try {
    const suggestions = await getSuggestionsForSession(sessionId);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to get session suggestions", 500);
  }
}
