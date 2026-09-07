import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import type { ProcessingJob } from "@/lib/revisions/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobPayload =
  | { type: "version-ingest"; versionId: string }
  | { type: "page-render"; pageVersionId: string; dpi: number }
  | { type: "page-match"; baseVersionId: string; comparisonVersionId: string }
  | { type: "auto-align"; pageMatchId: string }
  | { type: "diff-process"; comparisonId: string }
  | { type: "artifact-cleanup"; olderThanDays: number };

export type JobContext = {
  organizationId: string;
  projectId: string;
  drawingSetId?: string;
  versionId?: string;
  comparisonId?: string;
};

export interface JobExecutor {
  execute(job: ProcessingJob): Promise<void>;
}

// ─── Backoff schedule ─────────────────────────────────────────────────────────

function backoffSeconds(attemptCount: number): number {
  // attempt 1=0s, 2=30s, 3=120s
  if (attemptCount <= 1) return 0;
  if (attemptCount === 2) return 30;
  return 120;
}

// ─── DB → domain mapper ───────────────────────────────────────────────────────

function mapJob(row: {
  id: string;
  type: string;
  organizationId: string;
  projectId: string;
  drawingSetId: string | null;
  versionId: string | null;
  comparisonId: string | null;
  state: string;
  progress: number;
  stage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  maxAttempts: number;
  attemptCount: number;
  nextAttemptAt: Date | null;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}): ProcessingJob {
  return {
    id: row.id,
    type: row.type as ProcessingJob["type"],
    organizationId: row.organizationId,
    projectId: row.projectId,
    drawingSetId: row.drawingSetId,
    versionId: row.versionId,
    comparisonId: row.comparisonId,
    state: row.state as ProcessingJob["state"],
    progress: row.progress,
    stage: row.stage,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    maxAttempts: row.maxAttempts,
    attemptCount: row.attemptCount,
    nextAttemptAt: row.nextAttemptAt?.toISOString() ?? null,
    correlationId: row.correlationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ProcessingJobService {
  private executor: LocalJobRunner | null = null;

  setExecutor(executor: LocalJobRunner): void {
    this.executor = executor;
  }

  async enqueue(payload: JobPayload, ctx: JobContext): Promise<ProcessingJob> {
    const row = await prisma.processingJob.create({
      data: {
        type: payload.type,
        organizationId: ctx.organizationId,
        projectId: ctx.projectId,
        drawingSetId: ctx.drawingSetId ?? null,
        versionId: ctx.versionId ?? null,
        comparisonId: ctx.comparisonId ?? null,
        state: "queued",
        progress: 0,
        correlationId: randomUUID(),
      },
    });

    const job = mapJob(row);

    // In local mode, run synchronously
    if (this.executor) {
      void this.executor.run(job).catch(() => {
        // errors are persisted by the runner
      });
    }

    return job;
  }

  async getJob(jobId: string): Promise<ProcessingJob> {
    const row = await prisma.processingJob.findUnique({ where: { id: jobId } });
    if (!row) {
      throw Object.assign(new Error("Job not found"), { statusCode: 404 });
    }
    return mapJob(row);
  }

  async cancelJob(jobId: string, _actorId: string): Promise<void> {
    const row = await prisma.processingJob.findUnique({ where: { id: jobId } });
    if (!row) throw Object.assign(new Error("Job not found"), { statusCode: 404 });
    if (row.state !== "queued" && row.state !== "running") {
      throw Object.assign(new Error("Job cannot be cancelled"), { statusCode: 409 });
    }
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { state: "cancelled" },
    });
  }

  async runPendingJobs(): Promise<void> {
    if (!this.executor) return;
    const due = await prisma.processingJob.findMany({
      where: {
        state: { in: ["queued", "retrying"] },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
    });
    for (const row of due) {
      await this.executor.run(mapJob(row)).catch(() => {});
    }
  }
}

// ─── Local in-process runner ─────────────────────────────────────────────────

export class LocalJobRunner {
  private service: ProcessingJobService;

  constructor(service: ProcessingJobService) {
    this.service = service;
  }

  async run(job: ProcessingJob): Promise<void> {
    // Mark running
    const startTime = new Date();
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { state: "running", attemptCount: { increment: 1 } },
    });
    await prisma.processingJobAttempt.create({
      data: {
        jobId: job.id,
        attemptNumber: job.attemptCount + 1,
        state: "running",
      },
    });

    try {
      await this.dispatch(job);

      // Success
      await prisma.processingJob.update({
        where: { id: job.id },
        data: { state: "succeeded", progress: 100, stage: null },
      });
      await prisma.processingJobAttempt.updateMany({
        where: { jobId: job.id, endedAt: null },
        data: { endedAt: new Date(), state: "succeeded" },
      });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const errorCode = e.code ?? "UNKNOWN";
      const errorMessage = e.message ?? "Unknown error";

      const updated = await prisma.processingJob.findUnique({ where: { id: job.id } });
      const attemptsDone = updated?.attemptCount ?? 1;
      const maxAttempts = updated?.maxAttempts ?? 3;

      if (attemptsDone >= maxAttempts) {
        await prisma.processingJob.update({
          where: { id: job.id },
          data: { state: "failed", errorCode, errorMessage },
        });
      } else {
        const delaySec = backoffSeconds(attemptsDone + 1);
        const nextAttemptAt = new Date(Date.now() + delaySec * 1000);
        await prisma.processingJob.update({
          where: { id: job.id },
          data: { state: "retrying", errorCode, errorMessage, nextAttemptAt },
        });
      }

      await prisma.processingJobAttempt.updateMany({
        where: { jobId: job.id, endedAt: null },
        data: {
          endedAt: new Date(),
          state: "failed",
          errorCode,
          errorMessage,
        },
      });

      void startTime; // suppress unused warning
    }
  }

  private async dispatch(job: ProcessingJob): Promise<void> {
    switch (job.type) {
      case "version-ingest":
        await this.runVersionIngest(job);
        break;
      case "page-render":
        await this.runPageRender(job);
        break;
      case "page-match":
        await this.runPageMatch(job);
        break;
      case "auto-align":
        await this.runAutoAlign(job);
        break;
      case "diff-process":
        await this.runDiffProcess(job);
        break;
      case "artifact-cleanup":
        await this.runArtifactCleanup(job);
        break;
      default: {
        const _exhaustive: never = job.type;
        throw new Error(`Unknown job type: ${String(_exhaustive)}`);
      }
    }
  }

  private async runVersionIngest(job: ProcessingJob): Promise<void> {
    if (!job.versionId) throw new Error("version-ingest requires versionId");

    await prisma.processingJob.update({
      where: { id: job.id },
      data: { stage: "validating", progress: 10 },
    });

    const version = await prisma.drawingSetVersion.findUnique({
      where: { id: job.versionId },
    });
    if (!version) throw new Error("Version not found");

    // Get PDF from storage and create page stubs
    const { getArtifactStorage } = await import("./artifact-service");
    const storage = getArtifactStorage();

    if (!version.pdfKey) {
      throw new Error("Version has no pdfKey");
    }

    await prisma.processingJob.update({
      where: { id: job.id },
      data: { stage: "parsing-pdf", progress: 30 },
    });

    let pageCount = 1;
    try {
      const pdfBuffer = await storage.get(version.pdfKey);
      // Count pages: scan for /Type /Page markers
      const pdfStr = pdfBuffer.toString("latin1");
      const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
      pageCount = pageMatches ? pageMatches.length : 1;
    } catch {
      pageCount = 1;
    }

    await prisma.processingJob.update({
      where: { id: job.id },
      data: { stage: "creating-page-records", progress: 60 },
    });

    // Create page stubs
    const existingPages = await prisma.drawingPageVersion.findMany({
      where: { versionId: version.id },
    });

    if (existingPages.length === 0) {
      for (let i = 0; i < pageCount; i++) {
        await prisma.drawingPageVersion.create({
          data: {
            versionId: version.id,
            drawingSetId: version.drawingSetId,
            pageIndex: i,
            widthPt: 792, // letter default
            heightPt: 612,
            nativeRotation: 0,
            processingStatus: "ready",
          },
        });
      }
    }

    await prisma.drawingSetVersion.update({
      where: { id: version.id },
      data: { status: "ready", pageCount, revision: { increment: 1 } },
    });

    await prisma.processingJob.update({
      where: { id: job.id },
      data: { stage: "complete", progress: 100 },
    });
  }

  private async runPageRender(_job: ProcessingJob): Promise<void> {
    // Stub: actual rendering would use pdfjs or a headless browser
    // For now, just mark the page as having a render key
  }

  private async runPageMatch(job: ProcessingJob): Promise<void> {
    // Delegate to PageMatchingService logic
    const { proposeMatches } = await import("@/lib/revisions/page-matching");

    const baseVersionId = job.correlationId; // set by caller
    if (!baseVersionId) throw new Error("page-match requires version info in correlationId");

    // Job correlationId is used to carry base/comp version IDs as "base:comp"
    const parts = job.correlationId.split("|");
    if (parts.length < 2) return;
    const [bvId, cvId] = parts;

    const basePages = await prisma.drawingPageVersion.findMany({ where: { versionId: bvId } });
    const compPages = await prisma.drawingPageVersion.findMany({ where: { versionId: cvId } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const basePagesTyped = (basePages as any[]).map((p) => ({
      id: p.id,
      versionId: p.versionId,
      drawingSetId: p.drawingSetId,
      pageIndex: p.pageIndex,
      sheetNumber: p.sheetNumber,
      sheetTitle: p.sheetTitle,
      discipline: p.discipline,
      revisionLabel: p.revisionLabel,
      revisionDate: p.revisionDate?.toISOString() ?? null,
      widthPt: p.widthPt,
      heightPt: p.heightPt,
      nativeRotation: p.nativeRotation as 0 | 90 | 180 | 270,
      contentChecksum: p.contentChecksum,
      thumbnailKey: p.thumbnailKey,
      renderKey: p.renderKey,
      processingStatus: p.processingStatus as "pending" | "ready" | "failed",
      processingError: p.processingError,
      userConfirmedMetadata: p.userConfirmedMetadata,
      revision: p.revision,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compPagesTyped = (compPages as any[]).map((p) => ({
      id: p.id,
      versionId: p.versionId,
      drawingSetId: p.drawingSetId,
      pageIndex: p.pageIndex,
      sheetNumber: p.sheetNumber,
      sheetTitle: p.sheetTitle,
      discipline: p.discipline,
      revisionLabel: p.revisionLabel,
      revisionDate: p.revisionDate?.toISOString() ?? null,
      widthPt: p.widthPt,
      heightPt: p.heightPt,
      nativeRotation: p.nativeRotation as 0 | 90 | 180 | 270,
      contentChecksum: p.contentChecksum,
      thumbnailKey: p.thumbnailKey,
      renderKey: p.renderKey,
      processingStatus: p.processingStatus as "pending" | "ready" | "failed",
      processingError: p.processingError,
      userConfirmedMetadata: p.userConfirmedMetadata,
      revision: p.revision,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    const proposals = proposeMatches(basePagesTyped, compPagesTyped);

    const drawingSet = await prisma.drawingSetVersion.findUnique({ where: { id: bvId } });
    const drawingSetId = drawingSet?.drawingSetId ?? "";

    for (const p of proposals) {
      await prisma.pageMatch.create({
        data: {
          baseVersionId: bvId,
          comparisonVersionId: cvId,
          drawingSetId,
          basePageId: p.basePageId,
          comparisonPageId: p.comparisonPageId,
          status: p.status,
          confidence: p.confidence,
          matchReasonsJson: JSON.stringify(p.matchReasons),
        },
      });
    }
  }

  private async runAutoAlign(_job: ProcessingJob): Promise<void> {
    // Stub: auto-alignment would use image correlation
    // For now creates identity alignment
  }

  private async runDiffProcess(job: ProcessingJob): Promise<void> {
    if (!job.comparisonId) throw new Error("diff-process requires comparisonId");

    const comparison = await prisma.drawingComparison.findUnique({
      where: { id: job.comparisonId },
      include: { alignment: true },
    });
    if (!comparison) throw new Error("Comparison not found");

    await prisma.drawingComparison.update({
      where: { id: job.comparisonId },
      data: { status: "processing" },
    });

    await prisma.processingJob.update({
      where: { id: job.id },
      data: { stage: "loading-images", progress: 20 },
    });

    // Get alignment matrix
    const { IDENTITY_MATRIX } = await import("@/lib/revisions/matrices");
    const matrix = comparison.alignment
      ? (JSON.parse(comparison.alignment.matrixJson) as number[])
      : [...IDENTITY_MATRIX];

    const { getArtifactStorage } = await import("./artifact-service");
    const storage = getArtifactStorage();

    // Fetch page renders for base and comparison
    const basePageMatch = await prisma.pageMatch.findUnique({
      where: { id: comparison.pageMatchId },
      include: { basePage: true, comparisonPage: true },
    });

    if (!basePageMatch?.basePage || !basePageMatch?.comparisonPage) {
      throw new Error("Page match missing base or comparison page");
    }

    const baseRenderKey = basePageMatch.basePage.renderKey;
    const compRenderKey = basePageMatch.comparisonPage.renderKey;

    let baseBuffer: Buffer;
    let compBuffer: Buffer;

    if (baseRenderKey && (await storage.exists(baseRenderKey))) {
      baseBuffer = await storage.get(baseRenderKey);
    } else {
      // Create minimal white PNG as placeholder
      baseBuffer = await createMinimalPng(256, 256);
    }

    if (compRenderKey && (await storage.exists(compRenderKey))) {
      compBuffer = await storage.get(compRenderKey);
    } else {
      compBuffer = await createMinimalPng(256, 256);
    }

    await prisma.processingJob.update({
      where: { id: job.id },
      data: { stage: "computing-diff", progress: 50 },
    });

    const { computeDiff, DEFAULT_DIFF_CONFIG } = await import(
      "@/lib/revisions/image-difference"
    );
    const { mergeOverlappingRegions } = await import("@/lib/revisions/region-merging");
    const { diffMaskKey, diffOverlayKey } = await import("@/lib/revisions/artifact-keys");

    const alignMatrix = matrix as [
      number, number, number,
      number, number, number,
      number, number, number,
    ];

    const result = await computeDiff(baseBuffer, compBuffer, alignMatrix, DEFAULT_DIFF_CONFIG);
    const mergedRegions = mergeOverlappingRegions(result.regions);

    // Store mask and overlay
    const mKey = diffMaskKey(job.comparisonId, DEFAULT_DIFF_CONFIG.algorithmVersion);
    const oKey = diffOverlayKey(job.comparisonId, DEFAULT_DIFF_CONFIG.algorithmVersion);
    await storage.put(mKey, result.maskBuffer, "image/png");
    await storage.put(oKey, result.overlayBuffer, "image/png");

    await prisma.processingJob.update({
      where: { id: job.id },
      data: { stage: "saving-regions", progress: 80 },
    });

    // Save change regions
    const capped = mergedRegions.slice(0, DEFAULT_DIFF_CONFIG.maxRegions);
    for (const region of capped) {
      await prisma.changeRegion.create({
        data: {
          comparisonId: job.comparisonId,
          boundsJson: JSON.stringify(region.bounds),
          kind: region.kind,
          changedPixelCount: region.changedPixelCount,
          strength: region.strength,
          reviewStatus: "unreviewed",
        },
      });
    }

    await prisma.drawingComparison.update({
      where: { id: job.comparisonId },
      data: {
        status: "ready",
        maskKey: mKey,
        overlayKey: oKey,
        metricsJson: JSON.stringify(result.metrics),
        revision: { increment: 1 },
      },
    });
  }

  private async runArtifactCleanup(_job: ProcessingJob): Promise<void> {
    // Stub: would scan old artifacts and delete superseded ones
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getService(): ProcessingJobService {
    return this.service;
  }
}

// ─── Minimal PNG helper ───────────────────────────────────────────────────────

async function createMinimalPng(width: number, height: number): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _jobService: ProcessingJobService | null = null;

export function getJobService(): ProcessingJobService {
  if (_jobService) return _jobService;
  const svc = new ProcessingJobService();
  const runner = new LocalJobRunner(svc);
  svc.setExecutor(runner);
  _jobService = svc;
  return _jobService;
}
