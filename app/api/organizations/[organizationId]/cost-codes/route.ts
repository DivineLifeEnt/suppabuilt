import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { CreateCostCodeSchema } from "@/lib/estimating/schemas";
import { prisma } from "@/server/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { organizationId } = await params;
  if (user.orgId !== organizationId) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const codes = await prisma.costCode.findMany({ where: { organizationId }, orderBy: { code: "asc" } });
  return Response.json({ costCodes: codes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { organizationId } = await params;
  if (user.orgId !== organizationId) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 }); }
  const parsed = CreateCostCodeSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  const code = await prisma.costCode.create({ data: { organizationId, ...parsed.data } });
  return Response.json({ costCode: code }, { status: 201 });
}
