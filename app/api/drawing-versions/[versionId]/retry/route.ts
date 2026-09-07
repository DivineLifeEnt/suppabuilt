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
  try {
    const version = await svc.retryVersion(versionId, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ version });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 409) return Response.json({ error: { code: "CONFLICT", message: e.message } }, { status: 409 });
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
