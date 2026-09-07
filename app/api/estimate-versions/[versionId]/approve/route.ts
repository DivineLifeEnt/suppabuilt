import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { ReviewService } from "@/server/estimating/review-service";
import { ApproveSchema } from "@/lib/estimating/schemas";
import { prisma } from "@/server/db";

const reviewSvc = new ReviewService();

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
  try { await requirePermission(user.userId, projectId, "estimate:approve"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  try {
    const version = await reviewSvc.approve(versionId, parsed.data.comment ?? null, { userId: user.userId, orgId: user.orgId, name: user.name });
    return Response.json({ version });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    return Response.json({ error: { code: "CONFLICT", message: e.message } }, { status: e.statusCode ?? 409 });
  }
}
