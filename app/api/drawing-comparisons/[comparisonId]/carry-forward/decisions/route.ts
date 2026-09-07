import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { CarryForwardService } from "@/server/revisions/carry-forward-service";

const svc = new CarryForwardService();

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
  const decisions = await svc.getDecisions(comparisonId);
  void user;
  return Response.json({ decisions });
}
