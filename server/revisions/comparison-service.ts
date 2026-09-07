import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { getJobService } from "./processing-job-service";
import type { DrawingComparison, ChangeRegion, ComparisonMetrics } from "@/lib/revisions/types";

type Actor = { userId: string; orgId: string; name: string };

function mapComparison(row: {
  id: string;
  baseVersionId: string;
  comparisonVersionId: string;
  drawingSetId: string;
  pageMatchId: string;
  alignmentId: string | null;
  jobId: string | null;
  status: string;
  previewKey: string | null;
  maskKey: string | null;
  overlayKey: string | null;
  metricsJson: string | null;
  idempotencyKey: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): DrawingComparison {
  let metrics: ComparisonMetrics | null = null;
  if (row.metricsJson) {
    try {
      metrics = JSON.parse(row.metricsJson) as ComparisonMetrics;
    } catch {
      metrics = null;
    }
  }
  return {
    id: row.id,
    baseVersionId: row.baseVersionId,
    comparisonVersionId: row.comparisonVersionId,
    drawingSetId: row.drawingSetId,
    pageMatchId: row.pageMatchId,
    alignmentId: row.alignmentId,
    jobId: row.jobId,
    status: row.status as DrawingComparison["status"],
    previewKey: row.previewKey,
    maskKey: row.maskKey,
    overlayKey: row.overlayKey,
    metrics,
    idempotencyKey: row.idempotencyKey,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapRegion(row: {
  id: string;
  comparisonId: string;
  boundsJson: string;
  kind: string;
  changedPixelCount: number;
  strength: number;
  reviewStatus: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): ChangeRegion {
  return {
    id: row.id,
    comparisonId: row.comparisonId,
    bounds: JSON.parse(row.boundsJson) as ChangeRegion["bounds"],
    kind: row.kind as ChangeRegion["kind"],
    changedPixelCount: row.changedPixelCount,
    strength: row.strength,
    reviewStatus: row.reviewStatus as ChangeRegion["reviewStatus"],
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class ComparisonService {
  async createComparison(
    pageMatchId: string,
    idempotencyKey: string,
    actor: Actor
  ): Promise<DrawingComparison> {
    // Check idempotency
    const existing = await prisma.drawingComparison.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return mapComparison(existing);

    const match = await prisma.pageMatch.findUnique({
      where: { id: pageMatchId },
    });
    if (!match) throw Object.assign(new Error("Page match not found"), { statusCode: 404 });

    // Get latest alignment
    const alignment = await prisma.pageAlignment.findFirst({
      where: { pageMatchId },
      orderBy: { createdAt: "desc" },
    });

    const row = await prisma.drawingComparison.create({
      data: {
        baseVersionId: match.baseVersionId,
        comparisonVersionId: match.comparisonVersionId,
        drawingSetId: match.drawingSetId,
        pageMatchId,
        alignmentId: alignment?.id ?? null,
        status: "pending",
        idempotencyKey,
      },
    });

    void actor;
    return mapComparison(row);
  }

  async listComparisons(drawingSetId: string): Promise<DrawingComparison[]> {
    const rows = await prisma.drawingComparison.findMany({
      where: { drawingSetId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapComparison);
  }

  async getComparison(comparisonId: string): Promise<DrawingComparison> {
    const row = await prisma.drawingComparison.findUnique({ where: { id: comparisonId } });
    if (!row) throw Object.assign(new Error("Comparison not found"), { statusCode: 404 });
    return mapComparison(row);
  }

  async runComparison(comparisonId: string, actor: Actor): Promise<DrawingComparison> {
    const row = await prisma.drawingComparison.findUnique({ where: { id: comparisonId } });
    if (!row) throw Object.assign(new Error("Comparison not found"), { statusCode: 404 });

    if (row.status === "processing") {
      throw Object.assign(new Error("Comparison is already running"), { statusCode: 409 });
    }

    // Validate alignment confirmed if one exists
    if (row.alignmentId) {
      const alignment = await prisma.pageAlignment.findUnique({ where: { id: row.alignmentId } });
      if (alignment && !alignment.userConfirmed) {
        throw Object.assign(
          new Error("Alignment must be confirmed before running comparison"),
          { statusCode: 422, code: "ALIGNMENT_NOT_CONFIRMED" }
        );
      }
    }

    // Get drawingSet for org/project info
    const drawingSet = await prisma.drawingSet.findUnique({ where: { id: row.drawingSetId } });

    const jobSvc = getJobService();
    const job = await jobSvc.enqueue(
      { type: "diff-process", comparisonId },
      {
        organizationId: drawingSet?.organizationId ?? actor.orgId,
        projectId: drawingSet?.projectId ?? "",
        drawingSetId: row.drawingSetId,
        comparisonId,
      }
    );

    await prisma.drawingComparison.update({
      where: { id: comparisonId },
      data: { jobId: job.id, status: "processing", revision: { increment: 1 } },
    });

    const updated = await prisma.drawingComparison.findUnique({ where: { id: comparisonId } });
    return mapComparison(updated!);
  }

  async cancelComparison(comparisonId: string, actor: Actor): Promise<void> {
    const row = await prisma.drawingComparison.findUnique({ where: { id: comparisonId } });
    if (!row) throw Object.assign(new Error("Comparison not found"), { statusCode: 404 });

    if (row.jobId) {
      try {
        const jobSvc = getJobService();
        await jobSvc.cancelJob(row.jobId, actor.userId);
      } catch {
        // Job may already be done; proceed
      }
    }

    await prisma.drawingComparison.update({
      where: { id: comparisonId },
      data: { status: "failed", revision: { increment: 1 } },
    });
  }

  async retryComparison(comparisonId: string, actor: Actor): Promise<DrawingComparison> {
    const row = await prisma.drawingComparison.findUnique({ where: { id: comparisonId } });
    if (!row) throw Object.assign(new Error("Comparison not found"), { statusCode: 404 });

    if (row.status !== "failed") {
      throw Object.assign(new Error("Only failed comparisons can be retried"), { statusCode: 409 });
    }

    await prisma.drawingComparison.update({
      where: { id: comparisonId },
      data: { status: "pending", revision: { increment: 1 } },
    });

    return this.runComparison(comparisonId, actor);
  }

  async getRegions(comparisonId: string): Promise<ChangeRegion[]> {
    const rows = await prisma.changeRegion.findMany({
      where: { comparisonId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapRegion);
  }

  async updateRegion(
    regionId: string,
    reviewStatus: "accepted" | "dismissed",
    _actor: Actor
  ): Promise<ChangeRegion> {
    const existing = await prisma.changeRegion.findUnique({ where: { id: regionId } });
    if (!existing) throw Object.assign(new Error("Region not found"), { statusCode: 404 });

    const updated = await prisma.changeRegion.update({
      where: { id: regionId },
      data: { reviewStatus, revision: { increment: 1 } },
    });
    return mapRegion(updated);
  }
}
