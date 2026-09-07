import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { CarryForwardService } from "@/server/revisions/carry-forward-service";

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
  try {
    const preview = await svc.preview(comparisonId, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json(preview);
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
