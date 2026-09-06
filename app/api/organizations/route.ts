import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

const CreateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export async function GET(request: Request): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }

  const memberships = await prisma.organizationMembership.findMany({
    where: { userId: actor.userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  const orgs = memberships.map((m: typeof memberships[number]) => ({
    ...m.organization,
    role: m.role,
  }));

  return NextResponse.json({ organizations: orgs });
}

export async function POST(request: Request): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const parsed = CreateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } },
      { status: 422 }
    );
  }

  const slugTaken = await prisma.organization.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (slugTaken) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Slug already taken" } },
      { status: 409 }
    );
  }

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      memberships: {
        create: { userId: actor.userId, role: "owner" },
      },
    },
  });

  return NextResponse.json({ organization: org }, { status: 201 });
}
