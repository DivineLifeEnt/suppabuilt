import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { DrawingVersionService } from "@/server/revisions/drawing-version-service";
import { UpdatePageVersionSchema } from "@/lib/revisions/schemas";

const svc = new DrawingVersionService();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pageVersionId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { pageVersionId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }
  const parsed = UpdatePageVersionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  }
  try {
    const page = await svc.updatePageVersion(
      pageVersionId,
      parsed.data,
      parsed.data.expectedRevision,
      { userId: user.userId, orgId: user.orgId, name: user.name }
    );
    return Response.json({ page });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 409) return Response.json({ error: { code: "CONFLICT", message: e.message } }, { status: 409 });
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
