import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { CarryForwardService } from "@/server/revisions/carry-forward-service";
import { CarryForwardDecisionSchema } from "@/lib/revisions/schemas";

const svc = new CarryForwardService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ comparisonId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { comparisonId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }
  const parsed = CarryForwardDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  }
  try {
    const result = await svc.applyDecisions(
      comparisonId,
      parsed.data.decisions,
      parsed.data.idempotencyKey,
      { userId: user.userId, orgId: user.orgId, name: user.name }
    );
    return Response.json(result);
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
