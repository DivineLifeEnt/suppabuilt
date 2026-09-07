import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { recordAudit } from "@/server/collaboration/audit-service";
import { prisma } from "@/server/db";
import { randomUUID } from "crypto";

const PatchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  rate: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  amount: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  sortOrder: z.number().int().optional(),
});

const AUDIT_BASE = {
  organizationId: "", projectId: "", sessionId: null, actorName: "",
  aggregateType: "EstimateVersionAdjustment", previousRevision: null, resultingRevision: null,
  patchJson: null, origin: "system" as const, correlationId: "",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { adjustmentId: string } }
) {
  const actor = await requireAuth(req);
  const adj = await prisma.estimateVersionAdjustment.findUnique({
    where: { id: params.adjustmentId },
    include: { version: { include: { estimate: true } } },
  });
  if (!adj) return NextResponse.json({ error: "not found" }, { status: 404 });

  await requirePermission(actor.userId, adj.version.estimate.projectId, "estimate:edit");

  if (adj.version.status === "approved" || adj.version.status === "locked") {
    return NextResponse.json({ error: "version is immutable" }, { status: 422 });
  }

  const body = PatchSchema.parse(await req.json());
  const updated = await prisma.estimateVersionAdjustment.update({
    where: { id: params.adjustmentId },
    data: body,
  });

  await recordAudit({ ...AUDIT_BASE, actorId: actor.userId, action: "estimate.adjustment.updated", aggregateId: params.adjustmentId, correlationId: randomUUID() });
  return NextResponse.json({ adjustment: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { adjustmentId: string } }
) {
  const actor = await requireAuth(req);
  const adj = await prisma.estimateVersionAdjustment.findUnique({
    where: { id: params.adjustmentId },
    include: { version: { include: { estimate: true } } },
  });
  if (!adj) return NextResponse.json({ error: "not found" }, { status: 404 });

  await requirePermission(actor.userId, adj.version.estimate.projectId, "estimate:edit");

  if (adj.version.status === "approved" || adj.version.status === "locked") {
    return NextResponse.json({ error: "version is immutable" }, { status: 422 });
  }

  await prisma.estimateVersionAdjustment.delete({ where: { id: params.adjustmentId } });
  await recordAudit({ ...AUDIT_BASE, actorId: actor.userId, action: "estimate.adjustment.deleted", aggregateId: params.adjustmentId, correlationId: randomUUID() });
  return NextResponse.json({ deleted: true });
}
