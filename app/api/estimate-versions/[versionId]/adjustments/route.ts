import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { CreateAdjustmentSchema } from "@/lib/estimating/schemas";
import { prisma } from "@/server/db";

async function getProjectId(versionId: string) {
  const v = await prisma.estimateVersion.findUnique({ where: { id: versionId }, include: { estimate: true } });
  return v?.estimate?.projectId ?? null;
}

async function validateMutable(versionId: string) {
  const v = await prisma.estimateVersion.findUnique({ where: { id: versionId } });
  if (!v) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
  if (v.status === "approved" || v.status === "locked") {
    throw Object.assign(new Error(`Version is ${v.status} and immutable`), { statusCode: 422 });
  }
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
  const adjustments = await prisma.estimateVersionAdjustment.findMany({ where: { versionId }, orderBy: { sortOrder: "asc" } });
  return Response.json({ adjustments });
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
  try { await validateMutable(versionId); } catch (e) {
    const err = e as { statusCode?: number; message?: string };
    return Response.json({ error: { code: "IMMUTABLE", message: err.message } }, { status: err.statusCode ?? 422 });
  }
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 }); }
  const parsed = CreateAdjustmentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  const data = parsed.data;
  const adj = await prisma.estimateVersionAdjustment.create({
    data: {
      versionId,
      kind: data.kind,
      label: data.label,
      rate: "rate" in data ? data.rate : null,
      fixedAmount: "amount" in data ? data.amount : null,
      currency: "amount" in data ? (data as { currency?: string }).currency ?? null : null,
      basis: data.basis,
      taxable: data.taxable ?? false,
      sortOrder: data.sortOrder ?? 0,
      policySnapshot: JSON.stringify({ version: "1" }),
    },
  });
  return Response.json({ adjustment: adj }, { status: 201 });
}
