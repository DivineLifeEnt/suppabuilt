import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIEnabled } from "@/server/ai/ai-policy-service";
import { bulkReviewSuggestions } from "@/server/ai/suggestion-review-service";
import { BulkReviewSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /api/ai/suggestions/bulk-review
export async function POST(request: Request) {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  let user;
  try { user = await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const parsed = BulkReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid bulk review input", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  try {
    const suggestions = await bulkReviewSuggestions(parsed.data.items, user.userId);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") return apiError("NOT_FOUND", e.message, 404);
    console.error(err);
    return apiError("INTERNAL", "Failed to bulk review suggestions", 500);
  }
}
