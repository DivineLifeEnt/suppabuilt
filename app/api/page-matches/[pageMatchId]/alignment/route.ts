import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { AlignmentService } from "@/server/revisions/alignment-service";
import { AlignmentPointsSchema } from "@/lib/revisions/schemas";

const svc = new AlignmentService();

export async function GET(
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
  const alignment = await svc.getAlignment(pageMatchId);
  void user;
  if (!alignment) return Response.json({ alignment: null });
  return Response.json({ alignment });
}

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
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }
  const parsed = AlignmentPointsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  }
  try {
    const alignment = await svc.setManualAlignment(pageMatchId, parsed.data, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ alignment }, { status: 201 });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 422) return Response.json({ error: { code: e.code ?? "INVALID_MATRIX", message: e.message } }, { status: 422 });
    throw err;
  }
}
