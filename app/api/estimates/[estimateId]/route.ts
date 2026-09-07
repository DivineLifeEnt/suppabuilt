import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { EstimateService } from "@/server/estimating/estimate-service";
import { UpdateEstimateSchema } from "@/lib/estimating/schemas";
import { prisma } from "@/server/db";

const svc = new EstimateService();

async function getProjectId(estimateId: string) {
  const e = await prisma.estimate.findUnique({ where: { id: estimateId } });
  return e?.projectId ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ estimateId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { estimateId } = await params;
  const projectId = await getProjectId(estimateId);
  if (!projectId) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try { await requirePermission(user.userId, projectId, "estimate:view"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  const estimate = await svc.getEstimate(estimateId, user.userId);
  return Response.json({ estimate });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ estimateId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { estimateId } = await params;
  const projectId = await getProjectId(estimateId);
  if (!projectId) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try { await requirePermission(user.userId, projectId, "estimate:edit"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 }); }
  const parsed = UpdateEstimateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  const updated = await prisma.estimate.update({ where: { id: estimateId }, data: parsed.data });
  return Response.json({ estimate: updated });
}
