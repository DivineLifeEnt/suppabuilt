import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { recordAudit } from "@/server/collaboration/audit-service";
import { prisma } from "@/server/db";
import { randomUUID } from "crypto";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sortOrder: z.number().int().optional(),
});

const AUDIT_BASE = {
  organizationId: "", projectId: "", sessionId: null, actorName: "",
  aggregateType: "EstimateSection", previousRevision: null, resultingRevision: null,
  patchJson: null, origin: "system" as const, correlationId: "",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  const actor = await requireAuth(req);
  const section = await prisma.estimateSection.findUnique({
    where: { id: params.sectionId },
    include: { version: { include: { estimate: true } } },
  });
  if (!section) return NextResponse.json({ error: "not found" }, { status: 404 });

  await requirePermission(actor.userId, section.version.estimate.projectId, "estimate:edit");

  if (section.version.status === "approved" || section.version.status === "locked") {
    return NextResponse.json({ error: "version is immutable" }, { status: 422 });
  }

  const body = PatchSchema.parse(await req.json());
  const updated = await prisma.estimateSection.update({
    where: { id: params.sectionId },
    data: body,
  });

  await recordAudit({ ...AUDIT_BASE, actorId: actor.userId, action: "estimate.section.updated", aggregateId: params.sectionId, correlationId: randomUUID() });
  return NextResponse.json({ section: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  const actor = await requireAuth(req);
  const section = await prisma.estimateSection.findUnique({
    where: { id: params.sectionId },
    include: { version: { include: { estimate: true } } },
  });
  if (!section) return NextResponse.json({ error: "not found" }, { status: 404 });

  await requirePermission(actor.userId, section.version.estimate.projectId, "estimate:edit");

  if (section.version.status === "approved" || section.version.status === "locked") {
    return NextResponse.json({ error: "version is immutable" }, { status: 422 });
  }

  await prisma.estimateSection.delete({ where: { id: params.sectionId } });
  await recordAudit({ ...AUDIT_BASE, actorId: actor.userId, action: "estimate.section.deleted", aggregateId: params.sectionId, correlationId: randomUUID() });
  return NextResponse.json({ deleted: true });
}
