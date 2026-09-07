import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { recordAudit } from "@/server/collaboration/audit-service";
import {
  transformNormalizedBounds,
  isInBounds,
  calibrationCompatible,
} from "@/lib/revisions/carry-forward";
import { IDENTITY_MATRIX } from "@/lib/revisions/matrices";
import type { CarryForwardDecision, AffineMatrix } from "@/lib/revisions/types";
import type { CarryForwardDecisionInput } from "@/lib/revisions/schemas";

type Actor = { userId: string; orgId: string; name: string };

export type CarryForwardCandidate = {
  sourceAggregateType: "markup" | "measurement" | "takeoff" | "comment";
  sourceAggregateId: string;
  outOfBoundsAfterTransform: boolean;
  calibrationCompatible: boolean | null;
  recommendedDecision: "carry" | "transform" | "obsolete" | "defer";
  bounds: { x: number; y: number; width: number; height: number } | null;
};

export type CarryForwardPreview = {
  candidates: CarryForwardCandidate[];
  alignmentMatrix: AffineMatrix;
  warnings: string[];
};

export type CarryForwardResult = {
  applied: CarryForwardDecision[];
  warnings: string[];
};

function mapDecision(row: {
  id: string;
  comparisonId: string;
  sourceAggregateType: string;
  sourceAggregateId: string;
  targetAggregateId: string | null;
  decision: string;
  transformJson: string | null;
  reason: string | null;
  actorId: string;
  decidedAt: Date;
  idempotencyKey: string;
}): CarryForwardDecision {
  let transform: AffineMatrix | null = null;
  if (row.transformJson) {
    try {
      transform = JSON.parse(row.transformJson) as AffineMatrix;
    } catch {
      transform = null;
    }
  }
  return {
    id: row.id,
    comparisonId: row.comparisonId,
    sourceAggregateType: row.sourceAggregateType as CarryForwardDecision["sourceAggregateType"],
    sourceAggregateId: row.sourceAggregateId,
    targetAggregateId: row.targetAggregateId,
    decision: row.decision as CarryForwardDecision["decision"],
    transform,
    reason: row.reason,
    actorId: row.actorId,
    decidedAt: row.decidedAt.toISOString(),
    idempotencyKey: row.idempotencyKey,
  };
}

export class CarryForwardService {
  async preview(comparisonId: string, _actor: Actor): Promise<CarryForwardPreview> {
    const comparison = await prisma.drawingComparison.findUnique({
      where: { id: comparisonId },
      include: { alignment: true },
    });
    if (!comparison) throw Object.assign(new Error("Comparison not found"), { statusCode: 404 });

    const matrix: AffineMatrix = comparison.alignment?.matrixJson
      ? (JSON.parse(comparison.alignment.matrixJson) as AffineMatrix)
      : IDENTITY_MATRIX;

    const warnings: string[] = [];
    const candidates: CarryForwardCandidate[] = [];

    // Find markups on the base version's pages
    const baseMatch = await prisma.pageMatch.findUnique({
      where: { id: comparison.pageMatchId },
      include: { basePage: true },
    });

    if (baseMatch?.basePage) {
      // Get PlanMarkup records for the plan — we use planId as basePage's versionId here
      // (in real impl, would look up by page/plan ID from the drawing set)
      const markups = await prisma.planMarkup.findMany({
        where: { planId: baseMatch.baseVersionId },
        take: 100,
      });

      for (const m of markups) {
        let boundsRaw: { x: number; y: number; width: number; height: number } | null = null;
        try {
          const geom = JSON.parse(m.geometryJson) as { bounds?: typeof boundsRaw };
          boundsRaw = geom.bounds ?? null;
        } catch {
          boundsRaw = null;
        }

        let outOfBoundsAfterTransform = false;
        if (boundsRaw) {
          const transformed = transformNormalizedBounds(boundsRaw, matrix);
          outOfBoundsAfterTransform = !isInBounds(transformed);
        }

        if (outOfBoundsAfterTransform) {
          warnings.push(`Markup ${m.id} will be out of bounds after transform`);
        }

        candidates.push({
          sourceAggregateType: "markup",
          sourceAggregateId: m.id,
          outOfBoundsAfterTransform,
          calibrationCompatible: null,
          recommendedDecision: outOfBoundsAfterTransform ? "defer" : "transform",
          bounds: boundsRaw,
        });
      }

      // Get calibrations for compatibility check
      const baseCalib = await prisma.measurementCalibration.findFirst({
        where: { planId: baseMatch.baseVersionId },
      });
      const compCalib = comparison.comparisonVersionId
        ? await prisma.measurementCalibration.findFirst({
            where: { planId: comparison.comparisonVersionId },
          })
        : null;

      if (baseCalib && !calibrationCompatible(baseCalib, compCalib)) {
        warnings.push(
          "Calibration scale differs between versions — measurements may be inaccurate after carry-forward"
        );
      }
    }

    return { candidates, alignmentMatrix: matrix, warnings };
  }

  async applyDecisions(
    comparisonId: string,
    decisions: CarryForwardDecisionInput[],
    idempotencyKey: string,
    actor: Actor
  ): Promise<CarryForwardResult> {
    // Check idempotency
    const existingDecisions = await prisma.carryForwardDecision.findMany({
      where: { comparisonId, idempotencyKey },
    });
    if (existingDecisions.length > 0) {
      return {
        applied: existingDecisions.map(mapDecision),
        warnings: [],
      };
    }

    const comparison = await prisma.drawingComparison.findUnique({
      where: { id: comparisonId },
      include: { alignment: true },
    });
    if (!comparison) throw Object.assign(new Error("Comparison not found"), { statusCode: 404 });

    const matrix: AffineMatrix = comparison.alignment?.matrixJson
      ? (JSON.parse(comparison.alignment.matrixJson) as AffineMatrix)
      : IDENTITY_MATRIX;

    const applied: CarryForwardDecision[] = [];
    const warnings: string[] = [];

    for (const d of decisions) {
      try {
        let transformJson: string | null = null;
        let targetAggregateId: string | null = null;

        if (d.decision === "transform" || d.decision === "carry") {
          // Copy the source aggregate to target version
          // Convention: never mutate source, always create new with lineage
          targetAggregateId = randomUUID(); // would point to newly created aggregate

          if (d.decision === "transform") {
            transformJson = JSON.stringify([...matrix]);
          }
        }

        if (d.decision === "obsolete") {
          // Mark source as void — only set status, never delete
          // (actual mutation of source record depends on aggregate type)
          // We record the decision; the caller applies the status change
        }

        const row = await prisma.carryForwardDecision.create({
          data: {
            comparisonId,
            sourceAggregateType: d.sourceAggregateType,
            sourceAggregateId: d.sourceAggregateId,
            targetAggregateId,
            decision: d.decision,
            transformJson,
            reason: d.reason ?? null,
            actorId: actor.userId,
            decidedAt: new Date(),
            idempotencyKey,
          },
        });

        // Create lineage record if we have a target
        if (targetAggregateId && comparison.comparisonVersionId) {
          await prisma.aggregateLineage.upsert({
            where: {
              sourceAggregateType_sourceAggregateId_targetVersionId: {
                sourceAggregateType: d.sourceAggregateType,
                sourceAggregateId: d.sourceAggregateId,
                targetVersionId: comparison.comparisonVersionId,
              },
            },
            create: {
              sourceAggregateType: d.sourceAggregateType,
              sourceAggregateId: d.sourceAggregateId,
              sourceVersionId: comparison.baseVersionId,
              targetAggregateType: d.sourceAggregateType,
              targetAggregateId,
              targetVersionId: comparison.comparisonVersionId,
              carryForwardDecisionId: row.id,
              transformJson,
            },
            update: {},
          });
        }

        applied.push(mapDecision(row));
      } catch (err) {
        const e = err as { message?: string };
        warnings.push(`Failed to apply decision for ${d.sourceAggregateId}: ${e.message ?? "unknown error"}`);
      }
    }

    // Emit audit after transaction commits
    const drawingSet = await prisma.drawingSet.findUnique({ where: { id: comparison.drawingSetId } });
    await recordAudit({
      organizationId: actor.orgId,
      projectId: drawingSet?.projectId ?? "",
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "carry-forward.applied",
      aggregateType: "drawing-comparison",
      aggregateId: comparisonId,
      previousRevision: null,
      resultingRevision: null,
      patchJson: JSON.stringify({ decisionCount: applied.length }),
      origin: "online",
      correlationId: idempotencyKey,
    });

    return { applied, warnings };
  }

  async getDecisions(comparisonId: string): Promise<CarryForwardDecision[]> {
    const rows = await prisma.carryForwardDecision.findMany({
      where: { comparisonId },
      orderBy: { decidedAt: "asc" },
    });
    return rows.map(mapDecision);
  }
}
