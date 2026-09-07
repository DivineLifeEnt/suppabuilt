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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const b = body as Record<string, unknown>;
  const alignmentId = b.alignmentId as string | undefined;
  if (!alignmentId) {
    // Auto-confirm or get identity
    const alignment = await svc.getOrCreateIdentityAlignment(pageMatchId);
    return Response.json({ alignment });
  }
  try {
    const alignment = await svc.confirmAlignment(alignmentId, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ alignment });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
