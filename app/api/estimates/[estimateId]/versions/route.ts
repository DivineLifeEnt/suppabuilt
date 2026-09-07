import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { EstimateService } from "@/server/estimating/estimate-service";
import { prisma } from "@/server/db";

const svc = new EstimateService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ estimateId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { estimateId } = await params;
  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try { await requirePermission(user.userId, estimate.projectId, "estimate:edit"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  const version = await svc.createVersion(estimateId, { userId: user.userId, orgId: user.orgId, name: user.name });
  return Response.json({ version }, { status: 201 });
}
