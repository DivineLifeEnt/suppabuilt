import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { ComparisonService } from "@/server/revisions/comparison-service";

const svc = new ComparisonService();

export async function GET(
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
    const comparison = await svc.getComparison(comparisonId);
    void user;
    return Response.json({ comparison });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
