import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIEnabled } from "@/server/ai/ai-policy-service";
import { getCurrentMonthUsage } from "@/server/ai/usage-budget-service";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// GET /api/ai/usage
export async function GET() {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  let user;
  try { user = await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  try {
    const usage = await getCurrentMonthUsage(user.orgId);
    return NextResponse.json({ usage });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to get usage summary", 500);
  }
}
