import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { DrawingVersionService } from "@/server/revisions/drawing-version-service";

const svc = new DrawingVersionService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { versionId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const expectedRevision = typeof b.expectedRevision === "number" ? b.expectedRevision : 0;
  try {
    const version = await svc.confirmCurrentVersion(versionId, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    }, expectedRevision);
    return Response.json({ version });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 409) return Response.json({ error: { code: e.code ?? "CONFLICT", message: e.message } }, { status: 409 });
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
