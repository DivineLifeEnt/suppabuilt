import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import type { ExportJob, ExportType } from "@/lib/estimating/types";
import type { ExportJobInput } from "@/lib/exports/types";
import { getArtifactStorage } from "@/server/revisions/artifact-service";

function mapJob(row: {
  id: string; organizationId: string; projectId: string; requestedBy: string;
  exportType: string; status: string; sourceIds: string; templateId: string | null;
  parametersJson: string; idempotencyKey: string; progress: number; stage: string | null;
  errorCode: string | null; errorMessage: string | null; attemptCount: number;
  maxAttempts: number; nextAttemptAt: Date | null; versionId: string | null;
  outputKey: string | null; outputChecksum: string | null; outputSizeBytes: number | null;
  expiresAt: Date | null; correlationId: string; createdAt: Date; updatedAt: Date;
}): ExportJob {
  return {
    id: row.id, organizationId: row.organizationId, projectId: row.projectId,
    requestedBy: row.requestedBy, exportType: row.exportType as ExportType,
    status: row.status as ExportJob["status"],
    sourceIds: JSON.parse(row.sourceIds) as string[],
    templateId: row.templateId, parametersJson: row.parametersJson,
    idempotencyKey: row.idempotencyKey, progress: row.progress, stage: row.stage,
    errorCode: row.errorCode, errorMessage: row.errorMessage, attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    nextAttemptAt: row.nextAttemptAt?.toISOString() ?? null,
    versionId: row.versionId, outputKey: row.outputKey, outputChecksum: row.outputChecksum,
    outputSizeBytes: row.outputSizeBytes,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    correlationId: row.correlationId,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export class ExportJobService {
  async createExportJob(input: ExportJobInput, actor: { userId: string }): Promise<ExportJob> {
    // Check idempotency
    const existing = await prisma.exportJob.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return mapJob(existing);

    const retentionDays = parseInt(process.env.EXPORT_ARTIFACT_RETENTION_DAYS ?? "30");
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    const row = await prisma.exportJob.create({
      data: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        requestedBy: actor.userId,
        exportType: input.exportType,
        status: "queued",
        sourceIds: JSON.stringify(input.sourceIds),
        templateId: input.templateId,
        parametersJson: JSON.stringify({ includeInternal: input.includeInternal }),
        idempotencyKey: input.idempotencyKey,
        progress: 0,
        attemptCount: 0,
        maxAttempts: parseInt(process.env.EXPORT_WORKER_CONCURRENCY ?? "3"),
        versionId: input.versionId,
        correlationId: randomUUID(),
        expiresAt,
      },
    });

    const job = mapJob(row);

    // Dispatch async in background (fire and forget)
    void this._runJob(job).catch(() => {});

    return job;
  }

  async getExportJob(jobId: string, _actorId: string): Promise<ExportJob> {
    const row = await prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!row) throw Object.assign(new Error("Export job not found"), { statusCode: 404 });
    return mapJob(row);
  }

  async cancelExportJob(jobId: string, _actorId: string): Promise<void> {
    const row = await prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!row) throw Object.assign(new Error("Export job not found"), { statusCode: 404 });
    if (row.status !== "queued" && row.status !== "running") {
      throw Object.assign(new Error("Job cannot be cancelled"), { statusCode: 409 });
    }
    await prisma.exportJob.update({ where: { id: jobId }, data: { status: "cancelled" } });
  }

  async retryExportJob(jobId: string, actor: { userId: string }): Promise<ExportJob> {
    const row = await prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!row) throw Object.assign(new Error("Export job not found"), { statusCode: 404 });
    if (row.status !== "failed") {
      throw Object.assign(new Error("Only failed jobs can be retried"), { statusCode: 409 });
    }

    const updated = await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: "queued", progress: 0, errorCode: null, errorMessage: null },
    });

    const job = mapJob(updated);
    void this._runJob(job).catch(() => {});
    void actor;
    return job;
  }

  async downloadUrl(jobId: string, _actorId: string): Promise<string> {
    const row = await prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!row) throw Object.assign(new Error("Export job not found"), { statusCode: 404 });
    if (row.status !== "succeeded" || !row.outputKey) {
      throw Object.assign(new Error("Export not ready"), { statusCode: 404 });
    }
    const storage = getArtifactStorage();
    return storage.signedUrl(row.outputKey, 3600);
  }

  private async _runJob(job: ExportJob): Promise<void> {
    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "running", attemptCount: { increment: 1 } },
    });

    try {
      const { runExportJob } = await import("./export-runner");
      await runExportJob(job);

      const row = await prisma.exportJob.findUnique({ where: { id: job.id } });
      if (!row?.outputKey) {
        await prisma.exportJob.update({
          where: { id: job.id },
          data: { status: "succeeded", progress: 100 },
        });
      }
    } catch (err) {
      const e = err as { message?: string; code?: string };
      const row = await prisma.exportJob.findUnique({ where: { id: job.id } });
      const attempts = row?.attemptCount ?? 1;
      const maxAttempts = row?.maxAttempts ?? 3;
      const status = attempts >= maxAttempts ? "failed" : "retrying";
      await prisma.exportJob.update({
        where: { id: job.id },
        data: {
          status,
          errorCode: e.code ?? "EXPORT_FAILED",
          errorMessage: e.message ?? "Export failed",
          nextAttemptAt: status === "retrying" ? new Date(Date.now() + 30_000) : null,
        },
      });
    }
  }
}

let _svc: ExportJobService | null = null;
export function getExportJobService(): ExportJobService {
  if (!_svc) _svc = new ExportJobService();
  return _svc;
}
