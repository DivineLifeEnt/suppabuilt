import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { AlignmentService } from "@/server/revisions/alignment-service";

const svc = new AlignmentService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pageMatchId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { pageMatchId } = await params;
  const alignment = await svc.computeAutoAlignment(pageMatchId, {
    userId: user.userId,
    orgId: user.orgId,
    name: user.name,
  });
  return Response.json({ alignment });
}
