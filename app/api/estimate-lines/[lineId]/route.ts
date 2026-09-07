import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { EstimateService } from "@/server/estimating/estimate-service";
import { UpdateEstimateLineSchema } from "@/lib/estimating/schemas";
import { prisma } from "@/server/db";

const svc = new EstimateService();

async function getProjectId(lineId: string) {
  const line = await prisma.estimateLine.findUnique({
    where: { id: lineId },
    include: { section: { include: { version: { include: { estimate: true } } } } },
  });
  // Also look up via versionId directly
  if (!line) return null;
  const v = await prisma.estimateVersion.findUnique({ where: { id: line.versionId }, include: { estimate: true } });
  return v?.estimate?.projectId ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { lineId } = await params;
  const projectId = await getProjectId(lineId);
  if (!projectId) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try { await requirePermission(user.userId, projectId, "estimate:edit"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 }); }
  const parsed = UpdateEstimateLineSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  const { expectedRevision = 1, ...rest } = (body as Record<string, unknown>);
  try {
    const line = await svc.updateLine(lineId, rest as Parameters<typeof svc.updateLine>[1], { userId: user.userId, orgId: user.orgId, name: user.name }, Number(expectedRevision));
    return Response.json({ line });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    return Response.json({ error: { code: "ERROR", message: e.message } }, { status: e.statusCode ?? 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { lineId } = await params;
  const projectId = await getProjectId(lineId);
  if (!projectId) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try { await requirePermission(user.userId, projectId, "estimate:edit"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  try {
    await svc.deleteLine(lineId, { userId: user.userId, orgId: user.orgId, name: user.name });
    return new Response(null, { status: 204 });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    return Response.json({ error: { code: "ERROR", message: e.message } }, { status: e.statusCode ?? 500 });
  }
}
