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
  const regions = await svc.getRegions(comparisonId);
  void user;
  return Response.json({ regions });
}
