import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { ComparisonService } from "@/server/revisions/comparison-service";
import { RegionReviewSchema } from "@/lib/revisions/schemas";

const svc = new ComparisonService();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ regionId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { regionId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }
  const parsed = RegionReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  }
  try {
    const region = await svc.updateRegion(regionId, parsed.data.reviewStatus, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ region });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
