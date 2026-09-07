import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import type { EstimateVersion, Actor } from "@/lib/estimating/types";
import { recordAudit } from "@/server/collaboration/audit-service";

function mapVersion(row: {
  id: string; estimateId: string; versionNumber: number; status: string; currency: string;
  calculationPolicyVersion: string; createdBy: string; submittedBy: string | null;
  approvedBy: string | null; lockedBy: string | null; submittedAt: Date | null;
  approvedAt: Date | null; lockedAt: Date | null; revision: number;
  createdAt: Date; updatedAt: Date;
}): EstimateVersion {
  return {
    id: row.id, estimateId: row.estimateId, versionNumber: row.versionNumber,
    status: row.status as EstimateVersion["status"], currency: row.currency,
    calculationPolicyVersion: row.calculationPolicyVersion, createdBy: row.createdBy,
    submittedBy: row.submittedBy, approvedBy: row.approvedBy, lockedBy: row.lockedBy,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    lockedAt: row.lockedAt?.toISOString() ?? null,
    revision: row.revision, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

async function getVersionOrThrow(versionId: string) {
  const version = await prisma.estimateVersion.findUnique({ where: { id: versionId } });
  if (!version) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
  return version;
}

async function getProjectId(estimateId: string): Promise<string> {
  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  return estimate?.projectId ?? "unknown";
}

export class ReviewService {
  validateMutable(version: EstimateVersion): void {
    if (version.status === "approved" || version.status === "locked") {
      throw Object.assign(
        new Error(`Version is ${version.status} and cannot be modified`),
        { statusCode: 422 }
      );
    }
  }

  /** draft → in-review */
  async submitForReview(versionId: string, actor: Actor): Promise<EstimateVersion> {
    const version = await getVersionOrThrow(versionId);
    if (version.status !== "draft") {
      throw Object.assign(new Error("Only draft versions can be submitted for review"), { statusCode: 409 });
    }

    const updated = await prisma.estimateVersion.update({
      where: { id: versionId },
      data: {
        status: "in-review",
        submittedBy: actor.userId,
        submittedAt: new Date(),
        revision: { increment: 1 },
      },
    });

    await prisma.estimateReviewDecision.create({
      data: {
        versionId,
        actorId: actor.userId,
        action: "submit-review",
        comment: null,
      },
    });

    await recordAudit({
      organizationId: actor.orgId,
      projectId: await getProjectId(version.estimateId),
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "estimate-version.submit-review",
      aggregateType: "EstimateVersion",
      aggregateId: versionId,
      previousRevision: version.revision,
      resultingRevision: updated.revision,
      patchJson: JSON.stringify({ status: "in-review" }),
      origin: "online",
      correlationId: randomUUID(),
    });

    return mapVersion(updated);
  }

  /** in-review → changes-requested */
  async requestChanges(versionId: string, comment: string, actor: Actor): Promise<EstimateVersion> {
    const version = await getVersionOrThrow(versionId);
    if (version.status !== "in-review") {
      throw Object.assign(new Error("Version must be in-review to request changes"), { statusCode: 409 });
    }

    const updated = await prisma.estimateVersion.update({
      where: { id: versionId },
      data: { status: "changes-requested", revision: { increment: 1 } },
    });

    await prisma.estimateReviewDecision.create({
      data: { versionId, actorId: actor.userId, action: "request-changes", comment },
    });

    await recordAudit({
      organizationId: actor.orgId,
      projectId: await getProjectId(version.estimateId),
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "estimate-version.request-changes",
      aggregateType: "EstimateVersion",
      aggregateId: versionId,
      previousRevision: version.revision,
      resultingRevision: updated.revision,
      patchJson: JSON.stringify({ status: "changes-requested", comment }),
      origin: "online",
      correlationId: randomUUID(),
    });

    return mapVersion(updated);
  }

  /** in-review → approved */
  async approve(versionId: string, comment: string | null, actor: Actor): Promise<EstimateVersion> {
    const version = await getVersionOrThrow(versionId);
    if (version.status !== "in-review") {
      throw Object.assign(new Error("Version must be in-review to approve"), { statusCode: 409 });
    }

    const updated = await prisma.estimateVersion.update({
      where: { id: versionId },
      data: {
        status: "approved",
        approvedBy: actor.userId,
        approvedAt: new Date(),
        revision: { increment: 1 },
      },
    });

    await prisma.estimateReviewDecision.create({
      data: { versionId, actorId: actor.userId, action: "approve", comment },
    });

    await recordAudit({
      organizationId: actor.orgId,
      projectId: await getProjectId(version.estimateId),
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "estimate-version.approve",
      aggregateType: "EstimateVersion",
      aggregateId: versionId,
      previousRevision: version.revision,
      resultingRevision: updated.revision,
      patchJson: JSON.stringify({ status: "approved" }),
      origin: "online",
      correlationId: randomUUID(),
    });

    return mapVersion(updated);
  }

  /** approved → locked */
  async lock(versionId: string, actor: Actor): Promise<EstimateVersion> {
    const version = await getVersionOrThrow(versionId);
    if (version.status !== "approved") {
      throw Object.assign(new Error("Only approved versions can be locked"), { statusCode: 409 });
    }

    const updated = await prisma.estimateVersion.update({
      where: { id: versionId },
      data: {
        status: "locked",
        lockedBy: actor.userId,
        lockedAt: new Date(),
        revision: { increment: 1 },
      },
    });

    await prisma.estimateReviewDecision.create({
      data: { versionId, actorId: actor.userId, action: "lock", comment: null },
    });

    await recordAudit({
      organizationId: actor.orgId,
      projectId: await getProjectId(version.estimateId),
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "estimate-version.lock",
      aggregateType: "EstimateVersion",
      aggregateId: versionId,
      previousRevision: version.revision,
      resultingRevision: updated.revision,
      patchJson: JSON.stringify({ status: "locked" }),
      origin: "online",
      correlationId: randomUUID(),
    });

    return mapVersion(updated);
  }
}
