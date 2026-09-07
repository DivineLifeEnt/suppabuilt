import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import type { z } from "zod";
import type { CreateEstimateSchema, CreateEstimateSectionSchema, CreateEstimateLineSchema } from "@/lib/estimating/schemas";
import type { Estimate, EstimateVersion, EstimateSection, EstimateLine, Actor } from "@/lib/estimating/types";
import { recordAudit } from "@/server/collaboration/audit-service";

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapEstimate(row: {
  id: string; organizationId: string; projectId: string; estimateNumber: string;
  name: string; description: string | null; currency: string; status: string;
  currentVersionId: string | null; createdBy: string; createdAt: Date; updatedAt: Date;
}): Estimate {
  return {
    id: row.id, organizationId: row.organizationId, projectId: row.projectId,
    estimateNumber: row.estimateNumber, name: row.name, description: row.description,
    currency: row.currency, status: row.status as Estimate["status"],
    currentVersionId: row.currentVersionId, createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

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

function mapSection(row: {
  id: string; versionId: string; parentId: string | null; name: string;
  description: string | null; sortOrder: number; depth: number;
  createdAt: Date; updatedAt: Date;
}): EstimateSection {
  return {
    id: row.id, versionId: row.versionId, parentId: row.parentId, name: row.name,
    description: row.description, sortOrder: row.sortOrder, depth: row.depth,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

function mapLine(row: {
  id: string; versionId: string; sectionId: string | null; costCode: string | null;
  description: string; category: string; quantity: string; unit: string;
  unitMaterialCost: string; laborHoursPerUnit: string; burdenedLaborRate: string;
  unitEquipmentCost: string; unitSubcontractCost: string; unitOtherCost: string;
  wastePercent: string; notes: string | null; included: boolean; isAlternate: boolean;
  alternateId: string | null; sortOrder: number; sourceSnapshotId: string | null;
  revision: number; createdAt: Date; updatedAt: Date;
}): EstimateLine {
  return {
    id: row.id, versionId: row.versionId, sectionId: row.sectionId,
    costCode: row.costCode, description: row.description,
    category: row.category as EstimateLine["category"], quantity: row.quantity,
    unit: row.unit, unitMaterialCost: row.unitMaterialCost,
    laborHoursPerUnit: row.laborHoursPerUnit, burdenedLaborRate: row.burdenedLaborRate,
    unitEquipmentCost: row.unitEquipmentCost, unitSubcontractCost: row.unitSubcontractCost,
    unitOtherCost: row.unitOtherCost, wastePercent: row.wastePercent, notes: row.notes,
    included: row.included, isAlternate: row.isAlternate, alternateId: row.alternateId,
    sortOrder: row.sortOrder, sourceSnapshotId: row.sourceSnapshotId,
    revision: row.revision, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Estimate number generation ───────────────────────────────────────────────

async function generateEstimateNumber(organizationId: string): Promise<string> {
  const count = await prisma.estimate.count({ where: { organizationId } });
  const seq = String(count + 1).padStart(4, "0");
  return `EST-${seq}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class EstimateService {
  async createEstimate(
    input: z.infer<typeof CreateEstimateSchema>,
    actor: Actor
  ): Promise<Estimate> {
    const estimateNumber = await generateEstimateNumber(actor.orgId);
    const correlationId = randomUUID();

    const estimate = await prisma.estimate.create({
      data: {
        organizationId: actor.orgId,
        projectId: input.projectId,
        estimateNumber,
        name: input.name,
        description: input.description ?? null,
        currency: input.currency ?? "USD",
        status: "draft",
        createdBy: actor.userId,
      },
    });

    // Create initial draft version
    let version = await prisma.estimateVersion.create({
      data: {
        estimateId: estimate.id,
        versionNumber: 1,
        status: "draft",
        currency: input.currency ?? "USD",
        calculationPolicyVersion: "1",
        createdBy: actor.userId,
        revision: 1,
      },
    });

    // Handle source-based creation
    if (input.source.kind === "takeoff" && "takeoffGroupIds" in input.source) {
      await this._importFromTakeoff(version.id, input.source.takeoffGroupIds, actor);
    } else if (input.source.kind === "copy" && "fromVersionId" in input.source) {
      await this._copyFromVersion(version.id, input.source.fromVersionId);
    }

    // Set currentVersion
    const updated = await prisma.estimate.update({
      where: { id: estimate.id },
      data: { currentVersionId: version.id },
    });

    await recordAudit({
      organizationId: actor.orgId,
      projectId: input.projectId,
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "estimate.create",
      aggregateType: "Estimate",
      aggregateId: estimate.id,
      previousRevision: null,
      resultingRevision: 1,
      patchJson: JSON.stringify({ name: input.name, source: input.source.kind }),
      origin: "online",
      correlationId,
    });

    void version;
    return mapEstimate(updated);
  }

  private async _importFromTakeoff(
    versionId: string,
    groupIds: string[],
    actor: Actor
  ): Promise<void> {
    const items = await prisma.takeoffItem.findMany({
      where: { groupId: { in: groupIds } },
      include: { catalogItem: true },
    });

    for (const item of items) {
      // Create snapshot
      const snapshot = await prisma.estimateLineSourceSnapshot.create({
        data: {
          takeoffItemId: item.id,
          takeoffRevision: item.revision,
          quantity: item.grossQuantity,
          unit: item.unit,
          drawingVersionId: null,
          classifications: JSON.stringify({ category: item.catalogItem.category }),
          isStale: false,
        },
      });

      await prisma.estimateLine.create({
        data: {
          versionId,
          description: item.catalogItem.name,
          category: "material",
          quantity: item.grossQuantity,
          unit: item.unit,
          unitMaterialCost: "0",
          laborHoursPerUnit: "0",
          burdenedLaborRate: "0",
          unitEquipmentCost: "0",
          unitSubcontractCost: "0",
          unitOtherCost: "0",
          wastePercent: "0",
          included: true,
          isAlternate: false,
          sourceSnapshotId: snapshot.id,
          sortOrder: 0,
          revision: 1,
        },
      });
    }
    void actor;
  }

  private async _copyFromVersion(newVersionId: string, fromVersionId: string): Promise<void> {
    const sections = await prisma.estimateSection.findMany({ where: { versionId: fromVersionId } });
    const sectionIdMap = new Map<string, string>();

    for (const section of sections) {
      const newSection = await prisma.estimateSection.create({
        data: {
          versionId: newVersionId,
          parentId: null, // fix parent refs after
          name: section.name,
          description: section.description,
          sortOrder: section.sortOrder,
          depth: section.depth,
        },
      });
      sectionIdMap.set(section.id, newSection.id);
    }

    // Fix parent references
    for (const section of sections) {
      if (section.parentId) {
        const newParentId = sectionIdMap.get(section.parentId);
        const newSectionId = sectionIdMap.get(section.id);
        if (newParentId && newSectionId) {
          await prisma.estimateSection.update({
            where: { id: newSectionId },
            data: { parentId: newParentId },
          });
        }
      }
    }

    const lines = await prisma.estimateLine.findMany({ where: { versionId: fromVersionId } });
    for (const line of lines) {
      await prisma.estimateLine.create({
        data: {
          versionId: newVersionId,
          sectionId: line.sectionId ? (sectionIdMap.get(line.sectionId) ?? null) : null,
          costCode: line.costCode,
          description: line.description,
          category: line.category,
          quantity: line.quantity,
          unit: line.unit,
          unitMaterialCost: line.unitMaterialCost,
          laborHoursPerUnit: line.laborHoursPerUnit,
          burdenedLaborRate: line.burdenedLaborRate,
          unitEquipmentCost: line.unitEquipmentCost,
          unitSubcontractCost: line.unitSubcontractCost,
          unitOtherCost: line.unitOtherCost,
          wastePercent: line.wastePercent,
          notes: line.notes,
          included: line.included,
          isAlternate: line.isAlternate,
          alternateId: line.alternateId,
          sortOrder: line.sortOrder,
          sourceSnapshotId: null,
          revision: 1,
        },
      });
    }

    const adjustments = await prisma.estimateVersionAdjustment.findMany({
      where: { versionId: fromVersionId },
    });
    for (const adj of adjustments) {
      await prisma.estimateVersionAdjustment.create({
        data: {
          versionId: newVersionId,
          kind: adj.kind,
          label: adj.label,
          rate: adj.rate,
          fixedAmount: adj.fixedAmount,
          currency: adj.currency,
          basis: adj.basis,
          taxable: adj.taxable,
          sortOrder: adj.sortOrder,
          policySnapshot: adj.policySnapshot,
        },
      });
    }
  }

  async createVersion(estimateId: string, actor: Actor): Promise<EstimateVersion> {
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { currentVersion: true },
    });
    if (!estimate) throw Object.assign(new Error("Estimate not found"), { statusCode: 404 });
    if (!estimate.currentVersion) throw Object.assign(new Error("No current version"), { statusCode: 400 });

    const cv = estimate.currentVersion;
    if (cv.status !== "draft" && cv.status !== "changes-requested") {
      throw Object.assign(new Error("Can only create new version from draft or changes-requested"), { statusCode: 409 });
    }

    // Supersede current
    await prisma.estimateVersion.update({
      where: { id: cv.id },
      data: { status: "superseded" },
    });

    const maxVersion = await prisma.estimateVersion.aggregate({
      where: { estimateId },
      _max: { versionNumber: true },
    });
    const nextNum = (maxVersion._max.versionNumber ?? 0) + 1;

    const newVersion = await prisma.estimateVersion.create({
      data: {
        estimateId,
        versionNumber: nextNum,
        status: "draft",
        currency: cv.currency,
        calculationPolicyVersion: "1",
        createdBy: actor.userId,
        revision: 1,
      },
    });

    await this._copyFromVersion(newVersion.id, cv.id);

    await prisma.estimate.update({
      where: { id: estimateId },
      data: { currentVersionId: newVersion.id },
    });

    return mapVersion(newVersion);
  }

  async getEstimate(estimateId: string, _actorId: string): Promise<Estimate> {
    const row = await prisma.estimate.findUnique({ where: { id: estimateId } });
    if (!row) throw Object.assign(new Error("Estimate not found"), { statusCode: 404 });
    return mapEstimate(row);
  }

  async listEstimates(projectId: string, _actorId: string): Promise<Estimate[]> {
    const rows = await prisma.estimate.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapEstimate);
  }

  async createSection(
    versionId: string,
    input: z.infer<typeof CreateEstimateSectionSchema>,
    actor: Actor
  ): Promise<EstimateSection> {
    await this._validateMutableVersion(versionId);

    // Validate depth
    if (input.parentId) {
      const parent = await prisma.estimateSection.findUnique({ where: { id: input.parentId } });
      if (!parent) throw Object.assign(new Error("Parent section not found"), { statusCode: 404 });
      if (parent.depth >= 4) throw Object.assign(new Error("Max section depth is 5"), { statusCode: 422 });
    }

    const row = await prisma.estimateSection.create({
      data: {
        versionId,
        parentId: input.parentId ?? null,
        name: input.name,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        depth: input.parentId ? 1 : 0, // simplified; should compute from parent
      },
    });

    void actor;
    return mapSection(row);
  }

  async createLine(
    versionId: string,
    input: z.infer<typeof CreateEstimateLineSchema>,
    actor: Actor
  ): Promise<EstimateLine> {
    await this._validateMutableVersion(versionId);
    const row = await prisma.estimateLine.create({
      data: {
        versionId,
        sectionId: input.sectionId ?? null,
        costCode: input.costCode ?? null,
        description: input.description,
        category: input.category ?? "material",
        quantity: input.quantity ?? "1",
        unit: input.unit,
        unitMaterialCost: input.unitMaterialCost ?? "0",
        laborHoursPerUnit: input.laborHoursPerUnit ?? "0",
        burdenedLaborRate: input.burdenedLaborRate ?? "0",
        unitEquipmentCost: input.unitEquipmentCost ?? "0",
        unitSubcontractCost: input.unitSubcontractCost ?? "0",
        unitOtherCost: input.unitOtherCost ?? "0",
        wastePercent: input.wastePercent ?? "0",
        notes: input.notes ?? null,
        included: input.included ?? true,
        isAlternate: false,
        alternateId: null,
        sortOrder: input.sortOrder ?? 0,
        sourceSnapshotId: input.sourceSnapshotId ?? null,
        revision: 1,
      },
    });
    void actor;
    return mapLine(row);
  }

  async updateLine(
    lineId: string,
    input: Partial<z.infer<typeof CreateEstimateLineSchema>>,
    actor: Actor,
    expectedRevision: number
  ): Promise<EstimateLine> {
    const existing = await prisma.estimateLine.findUnique({ where: { id: lineId } });
    if (!existing) throw Object.assign(new Error("Line not found"), { statusCode: 404 });
    if (existing.revision !== expectedRevision) {
      throw Object.assign(new Error("Revision conflict"), { statusCode: 409 });
    }
    await this._validateMutableVersion(existing.versionId);

    const row = await prisma.estimateLine.update({
      where: { id: lineId },
      data: {
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.quantity !== undefined && { quantity: input.quantity }),
        ...(input.unit !== undefined && { unit: input.unit }),
        ...(input.unitMaterialCost !== undefined && { unitMaterialCost: input.unitMaterialCost }),
        ...(input.laborHoursPerUnit !== undefined && { laborHoursPerUnit: input.laborHoursPerUnit }),
        ...(input.burdenedLaborRate !== undefined && { burdenedLaborRate: input.burdenedLaborRate }),
        ...(input.unitEquipmentCost !== undefined && { unitEquipmentCost: input.unitEquipmentCost }),
        ...(input.unitSubcontractCost !== undefined && { unitSubcontractCost: input.unitSubcontractCost }),
        ...(input.unitOtherCost !== undefined && { unitOtherCost: input.unitOtherCost }),
        ...(input.wastePercent !== undefined && { wastePercent: input.wastePercent }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.included !== undefined && { included: input.included }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.sectionId !== undefined && { sectionId: input.sectionId }),
        ...(input.costCode !== undefined && { costCode: input.costCode }),
        revision: { increment: 1 },
      },
    });
    void actor;
    return mapLine(row);
  }

  async deleteLine(lineId: string, actor: Actor): Promise<void> {
    const existing = await prisma.estimateLine.findUnique({ where: { id: lineId } });
    if (!existing) throw Object.assign(new Error("Line not found"), { statusCode: 404 });
    await this._validateMutableVersion(existing.versionId);
    await prisma.estimateLine.delete({ where: { id: lineId } });
    void actor;
  }

  private async _validateMutableVersion(versionId: string): Promise<void> {
    const version = await prisma.estimateVersion.findUnique({ where: { id: versionId } });
    if (!version) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
    if (version.status === "approved" || version.status === "locked") {
      throw Object.assign(
        new Error(`Version is ${version.status} and cannot be modified`),
        { statusCode: 422 }
      );
    }
  }
}
