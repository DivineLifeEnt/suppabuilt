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
  const pages = await svc.listPageVersions(versionId);
  void user;
  return Response.json({ pages });
}
