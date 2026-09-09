import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAIEnabled, getOrgAIPolicy, setOrgAIPolicy } from "@/server/ai/ai-policy-service";
import { AIBudgetPolicySchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// GET /api/ai/policy
export async function GET() {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  let user;
  try { user = await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  try {
    const policy = await getOrgAIPolicy(user.orgId);
    return NextResponse.json({ policy });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to get AI policy", 500);
  }
}

// PUT /api/ai/policy
export async function PUT(request: Request) {
  if (!isAIEnabled()) return apiError("AI_DISABLED", "AI analysis is not enabled", 403);

  let user;
  try { user = await requireAuth(); } catch { return apiError("UNAUTHENTICATED", "Authentication required", 401); }

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const parsed = AIBudgetPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid policy input", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  try {
    const policy = await setOrgAIPolicy(user.orgId, { monthlyLimitUsd: parsed.data.monthlyLimitUsd });
    return NextResponse.json({ policy });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to update AI policy", 500);
  }
}
