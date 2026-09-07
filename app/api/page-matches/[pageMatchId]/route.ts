import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { PageMatchingService } from "@/server/revisions/page-matching-service";
import { PageMatchUpdateSchema } from "@/lib/revisions/schemas";

const svc = new PageMatchingService();

export async function PATCH(
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
  const parsed = PageMatchUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  }
  try {
    const match = await svc.updateMatch(pageMatchId, parsed.data, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ match });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 409) return Response.json({ error: { code: "CONFLICT", message: e.message } }, { status: 409 });
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
