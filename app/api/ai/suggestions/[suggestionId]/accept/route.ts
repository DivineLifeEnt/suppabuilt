import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIEnabled } from "@/server/ai/ai-policy-service";
import { acceptSuggestion } from "@/server/ai/suggestion-review-service";
import { z } from "zod";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

const AcceptBodySchema = z.object({
  takeoffInput: z.object({
    qty: z.number().positive(),
    unit: z.string(),
    description: z.string(),
  }),
});

type Params = { params: Promise<{ suggestionId: string }> };

// POST /api/ai/suggestions/[suggestionId]/accept
export async function POST(request: Request, { params }: Params) {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  let user;
  try { user = await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  const { suggestionId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const parsed = AcceptBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "takeoffInput is required", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  try {
    const suggestion = await acceptSuggestion(suggestionId, user.userId, parsed.data.takeoffInput);
    return NextResponse.json({ suggestion });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_FOUND") return apiError("NOT_FOUND", e.message, 404);
    console.error(err);
    return apiError("INTERNAL", "Failed to accept suggestion", 500);
  }
}
