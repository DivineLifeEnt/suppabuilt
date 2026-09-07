/**
 * Dispatches an export job to the appropriate exporter.
 */
import { prisma } from "@/server/db";
import { getArtifactStorage } from "@/server/revisions/artifact-service";
import { CalculationService } from "@/server/estimating/calculation-service";
import type { ExportJob } from "@/lib/estimating/types";
import { createHash } from "node:crypto";

const calcSvc = new CalculationService();

export async function runExportJob(job: ExportJob): Promise<void> {
  const params = JSON.parse(job.parametersJson) as { includeInternal?: boolean };
  const includeInternal = params.includeInternal !== false;

  let buffer: Buffer;
  let contentType: string;
  let ext: string;

  switch (job.exportType) {
    case "takeoff-xlsx": {
      const { exportTakeoffXlsx } = await import("./spreadsheet-exporter");
      // Load takeoff items from sourceIds
      const items = await prisma.takeoffItem.findMany({
        where: { id: { in: job.sourceIds } },
      });
      const groups = await prisma.takeoffGroup.findMany({
        where: { planId: { in: [...new Set(items.map((i: { planId: string }) => i.planId))] } },
      });
      buffer = await exportTakeoffXlsx(items as never, groups as never);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      ext = "xlsx";
      break;
    }

    case "estimate-internal-xlsx":
    case "estimate-customer-pdf":
    case "estimate-detail-pdf":
    case "estimate-csv": {
      if (!job.versionId) throw Object.assign(new Error("versionId required for estimate exports"), { code: "MISSING_VERSION_ID" });
      const version = await prisma.estimateVersion.findUnique({
        where: { id: job.versionId },
      });
      if (!version) throw Object.assign(new Error("Version not found"), { code: "NOT_FOUND" });
      const lines = await prisma.estimateLine.findMany({ where: { versionId: job.versionId } });
      const totals = await calcSvc.calculateVersionTotals(job.versionId);

      if (job.exportType === "estimate-internal-xlsx" || job.exportType === "estimate-csv") {
        const { exportEstimateXlsx } = await import("./spreadsheet-exporter");
        buffer = await exportEstimateXlsx(version as never, lines as never, totals, includeInternal);
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        ext = "xlsx";
      } else {
        const { exportEstimatePdf } = await import("./pdf-exporter");
        const template = { showLogo: false, showUnitCosts: includeInternal, showLaborRates: includeInternal, showMargins: includeInternal, showInternalNotes: includeInternal, headerText: null, footerText: null, companyName: null, companyAddress: null, termsText: null };
        buffer = await exportEstimatePdf(version as never, lines as never, totals, template, includeInternal);
        contentType = "application/pdf";
        ext = "pdf";
      }
      break;
    }

    case "flattened-plan-pdf": {
      const { exportFlattenedPlanPdf } = await import("./pdf-exporter");
      buffer = await exportFlattenedPlanPdf();
      contentType = "application/pdf";
      ext = "pdf";
      break;
    }

    default: {
      // Generic stub for other types
      buffer = Buffer.from(`Export type ${job.exportType} not yet implemented`);
      contentType = "text/plain";
      ext = "txt";
    }
  }

  const storage = getArtifactStorage();
  const outputKey = `exports/${job.organizationId}/${job.id}.${ext}`;
  await storage.put(outputKey, buffer, contentType);

  const checksum = createHash("sha256").update(buffer).digest("hex");
  await prisma.exportJob.update({
    where: { id: job.id },
    data: {
      status: "succeeded",
      progress: 100,
      stage: "complete",
      outputKey,
      outputChecksum: checksum,
      outputSizeBytes: buffer.length,
    },
  });
}
