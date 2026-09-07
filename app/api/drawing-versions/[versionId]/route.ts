import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { DrawingVersionService } from "@/server/revisions/drawing-version-service";

const svc = new DrawingVersionService();

export async function GET(
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
    const version = await svc.getVersion(versionId, user.userId);
    return Response.json({ version });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
