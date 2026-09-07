import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { EstimateService } from "@/server/estimating/estimate-service";
import { CreateEstimateSchema } from "@/lib/estimating/schemas";

const svc = new EstimateService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { projectId } = await params;
  try { await requirePermission(user.userId, projectId, "estimate:view"); }
  catch { return Response.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 }); }
  const estimates = await svc.listEstimates(projectId, user.userId);
  return Response.json({ estimates });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { projectId } = await params;
  try { await requirePermission(user.userId, projectId, "estimate:edit"); }
  catch { return Response.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 }); }
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, { status: 400 }); }
  const parsed = CreateEstimateSchema.safeParse({ ...(body as object), projectId });
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  const estimate = await svc.createEstimate(parsed.data, { userId: user.userId, orgId: user.orgId, name: user.name });
  return Response.json({ estimate }, { status: 201 });
}
