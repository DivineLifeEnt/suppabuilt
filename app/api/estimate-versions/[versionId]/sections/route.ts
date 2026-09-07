import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { EstimateService } from "@/server/estimating/estimate-service";
import { CreateEstimateSectionSchema } from "@/lib/estimating/schemas";
import { prisma } from "@/server/db";

const svc = new EstimateService();

async function getProjectId(versionId: string) {
  const v = await prisma.estimateVersion.findUnique({ where: { id: versionId }, include: { estimate: true } });
  return v?.estimate?.projectId ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { versionId } = await params;
  const projectId = await getProjectId(versionId);
  if (!projectId) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try { await requirePermission(user.userId, projectId, "estimate:view"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  const sections = await prisma.estimateSection.findMany({ where: { versionId }, orderBy: [{ depth: "asc" }, { sortOrder: "asc" }] });
  return Response.json({ sections });
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
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 }); }
  const parsed = CreateEstimateSectionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  try {
    const section = await svc.createSection(versionId, parsed.data, { userId: user.userId, orgId: user.orgId, name: user.name });
    return Response.json({ section }, { status: 201 });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    return Response.json({ error: { code: "ERROR", message: e.message } }, { status: e.statusCode ?? 500 });
  }
}
