import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { SourceRefreshService } from "@/server/estimating/source-refresh-service";
import { prisma } from "@/server/db";

const svc = new SourceRefreshService();

async function getProjectId(versionId: string) {
  const v = await prisma.estimateVersion.findUnique({ where: { id: versionId }, include: { estimate: true } });
  return v?.estimate?.projectId ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { versionId } = await params;
  const projectId = await getProjectId(versionId);
  if (!projectId) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try { await requirePermission(user.userId, projectId, "estimate:edit"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  const preview = await svc.previewRefresh(versionId, user.userId);
  return Response.json({ preview });
}
