import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ organizationId: string }> };

const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100),
});

async function getMembership(userId: string, organizationId: string) {
  return prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { organization: true },
  });
}

export async function GET(request: Request, { params }: Params): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { organizationId } = await params;

  const membership = await getMembership(actor.userId, organizationId);
  if (!membership) return forbiddenError("Not a member of this organization");

  return NextResponse.json({
    organization: membership.organization,
    role: membership.role,
  });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { organizationId } = await params;

  const membership = await getMembership(actor.userId, organizationId);
  if (!membership) return forbiddenError("Not a member of this organization");
  if (membership.role !== "admin" && membership.role !== "owner") {
    return forbiddenError("Only admins and owners can update the organization");
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = UpdateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } },
      { status: 422 }
    );
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ organization: updated });
}
