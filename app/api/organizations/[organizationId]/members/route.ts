import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ organizationId: string }> };

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin"]).default("member"),
});

async function requireAdminOrOwner(userId: string, organizationId: string): Promise<void> {
  const membership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!membership) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  if (membership.role !== "admin" && membership.role !== "owner") {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
}

export async function GET(request: Request, { params }: Params): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { organizationId } = await params;

  const isMember = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: actor.userId } },
  });
  if (!isMember) return forbiddenError("Not a member of this organization");

  const members = await prisma.organizationMembership.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function POST(request: Request, { params }: Params): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { organizationId } = await params;

  try {
    await requireAdminOrOwner(actor.userId, organizationId);
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 403) return forbiddenError();
    return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = InviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } },
      { status: 422 }
    );
  }

  const invitee = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!invitee) {
    return NextResponse.json(
      { error: { code: "USER_NOT_FOUND", message: "No user with that email" } },
      { status: 404 }
    );
  }

  const existing = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: invitee.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: { code: "ALREADY_MEMBER", message: "User is already a member" } },
      { status: 409 }
    );
  }

  const membership = await prisma.organizationMembership.create({
    data: {
      organizationId,
      userId: invitee.id,
      role: parsed.data.role,
    },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
