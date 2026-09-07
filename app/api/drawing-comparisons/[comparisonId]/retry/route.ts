import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { ComparisonService } from "@/server/revisions/comparison-service";

const svc = new ComparisonService();

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
  try {
    const comparison = await svc.retryComparison(comparisonId, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ comparison });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 409) return Response.json({ error: { code: "CONFLICT", message: e.message } }, { status: 409 });
    throw err;
  }
}
