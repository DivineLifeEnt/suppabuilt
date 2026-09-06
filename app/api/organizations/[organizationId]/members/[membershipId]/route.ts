import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ organizationId: string; membershipId: string }> };

const ChangeRoleSchema = z.object({
  role: z.enum(["member", "admin"]),
});

async function getActorMembership(userId: string, organizationId: string) {
  return prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { organizationId, membershipId } = await params;

  const actorMembership = await getActorMembership(actor.userId, organizationId);
  if (!actorMembership) return forbiddenError("Not a member");
  if (actorMembership.role !== "owner") {
    return forbiddenError("Only owners can change member roles");
  }

  const target = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
  });
  if (!target || target.organizationId !== organizationId) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  if (target.role === "owner") {
    return forbiddenError("Cannot change the role of an owner");
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = ChangeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } },
      { status: 422 }
    );
  }

  const updated = await prisma.organizationMembership.update({
    where: { id: membershipId },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ membership: updated });
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { organizationId, membershipId } = await params;

  const actorMembership = await getActorMembership(actor.userId, organizationId);
  if (!actorMembership) return forbiddenError("Not a member");
  if (actorMembership.role !== "admin" && actorMembership.role !== "owner") {
    return forbiddenError("Only admins and owners can remove members");
  }

  const target = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
  });
  if (!target || target.organizationId !== organizationId) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  if (target.role === "owner") {
    return forbiddenError("Cannot remove the owner");
  }
  // Admins cannot remove other admins — only owners can
  if (actorMembership.role === "admin" && target.role === "admin") {
    return forbiddenError("Admins cannot remove other admins");
  }

  await prisma.organizationMembership.delete({ where: { id: membershipId } });
  return new Response(null, { status: 204 });
}
