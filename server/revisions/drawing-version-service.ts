import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { recordAudit } from "@/server/collaboration/audit-service";
import { getArtifactStorage } from "./artifact-service";
import { getJobService } from "./processing-job-service";
import { pdfKey } from "@/lib/revisions/artifact-keys";
import type { DrawingSet, DrawingSetVersion, DrawingPageVersion } from "@/lib/revisions/types";
import type { CreateDrawingSetInput, CreateVersionInput } from "@/lib/revisions/schemas";

type Actor = { userId: string; orgId: string; name: string };

const MAX_PDF_MB = Number(process.env.REVISION_MAX_PDF_MB ?? "250");
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
const PDF_MAGIC = Buffer.from("%PDF-");

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapDrawingSet(row: {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  discipline: string | null;
  currentVersionId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): DrawingSet {
  return {
    id: row.id,
    projectId: row.projectId,
    organizationId: row.organizationId,
    name: row.name,
    discipline: row.discipline,
    currentVersionId: row.currentVersionId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapVersion(row: {
  id: string;
  drawingSetId: string;
  revisionName: string;
  revisionNumber: string | null;
  issueDate: Date | null;
  receivedDate: Date | null;
  description: string | null;
  sourceFilename: string;
  checksum: string;
  uploadedBy: string;
  status: string;
  pageCount: number | null;
  processingError: string | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): DrawingSetVersion {
  return {
    id: row.id,
    drawingSetId: row.drawingSetId,
    revisionName: row.revisionName,
    revisionNumber: row.revisionNumber,
    issueDate: row.issueDate?.toISOString() ?? null,
    receivedDate: row.receivedDate?.toISOString() ?? null,
    description: row.description,
    sourceFilename: row.sourceFilename,
    checksum: row.checksum,
    uploadedBy: row.uploadedBy,
    status: row.status as DrawingSetVersion["status"],
    pageCount: row.pageCount,
    processingError: row.processingError,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapPageVersion(row: {
  id: string;
  versionId: string;
  drawingSetId: string;
  pageIndex: number;
  sheetNumber: string | null;
  sheetTitle: string | null;
  discipline: string | null;
  revisionLabel: string | null;
  revisionDate: Date | null;
  widthPt: number;
  heightPt: number;
  nativeRotation: number;
  contentChecksum: string | null;
  thumbnailKey: string | null;
  renderKey: string | null;
  processingStatus: string;
  processingError: string | null;
  userConfirmedMetadata: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): DrawingPageVersion {
  return {
    id: row.id,
    versionId: row.versionId,
    drawingSetId: row.drawingSetId,
    pageIndex: row.pageIndex,
    sheetNumber: row.sheetNumber,
    sheetTitle: row.sheetTitle,
    discipline: row.discipline,
    revisionLabel: row.revisionLabel,
    revisionDate: row.revisionDate?.toISOString() ?? null,
    widthPt: row.widthPt,
    heightPt: row.heightPt,
    nativeRotation: row.nativeRotation as 0 | 90 | 180 | 270,
    contentChecksum: row.contentChecksum,
    thumbnailKey: row.thumbnailKey,
    renderKey: row.renderKey,
    processingStatus: row.processingStatus as DrawingPageVersion["processingStatus"],
    processingError: row.processingError,
    userConfirmedMetadata: row.userConfirmedMetadata,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class DrawingVersionService {
  async createDrawingSet(input: CreateDrawingSetInput, actor: Actor): Promise<DrawingSet> {
    const row = await prisma.drawingSet.create({
      data: {
        projectId: actor.orgId, // caller should pass projectId via input; using orgId as fallback
        organizationId: actor.orgId,
        name: input.name,
        discipline: input.discipline ?? null,
        createdBy: actor.userId,
      },
    });
    await recordAudit({
      organizationId: actor.orgId,
      projectId: row.projectId,
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "drawing-set.created",
      aggregateType: "drawing-set",
      aggregateId: row.id,
      previousRevision: null,
      resultingRevision: null,
      patchJson: JSON.stringify({ name: input.name }),
      origin: "online",
      correlationId: randomUUID(),
    });
    return mapDrawingSet(row);
  }

  async createDrawingSetForProject(
    projectId: string,
    input: CreateDrawingSetInput,
    actor: Actor
  ): Promise<DrawingSet> {
    const row = await prisma.drawingSet.create({
      data: {
        projectId,
        organizationId: actor.orgId,
        name: input.name,
        discipline: input.discipline ?? null,
        createdBy: actor.userId,
      },
    });
    await recordAudit({
      organizationId: actor.orgId,
      projectId,
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "drawing-set.created",
      aggregateType: "drawing-set",
      aggregateId: row.id,
      previousRevision: null,
      resultingRevision: null,
      patchJson: JSON.stringify({ name: input.name }),
      origin: "online",
      correlationId: randomUUID(),
    });
    return mapDrawingSet(row);
  }

  async listDrawingSets(projectId: string): Promise<DrawingSet[]> {
    const rows = await prisma.drawingSet.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapDrawingSet);
  }

  async getDrawingSet(drawingSetId: string): Promise<DrawingSet> {
    const row = await prisma.drawingSet.findUnique({ where: { id: drawingSetId } });
    if (!row) throw Object.assign(new Error("Drawing set not found"), { statusCode: 404 });
    return mapDrawingSet(row);
  }

  async uploadVersion(
    drawingSetId: string,
    file: Buffer,
    filename: string,
    metadata: CreateVersionInput,
    actor: Actor
  ): Promise<DrawingSetVersion> {
    // Validate PDF magic bytes
    if (!file.subarray(0, 5).equals(PDF_MAGIC)) {
      throw Object.assign(new Error("File does not appear to be a PDF"), {
        statusCode: 400,
        code: "INVALID_PDF",
      });
    }

    // Validate size
    if (file.length > MAX_PDF_BYTES) {
      throw Object.assign(
        new Error(`PDF exceeds maximum size of ${MAX_PDF_MB}MB`),
        { statusCode: 400, code: "FILE_TOO_LARGE" }
      );
    }

    // Compute checksum
    const checksum = createHash("sha256").update(file).digest("hex");

    // Check for duplicate within drawing set
    const existing = await prisma.drawingSetVersion.findUnique({
      where: { drawingSetId_checksum: { drawingSetId, checksum } },
    });
    if (existing) {
      throw Object.assign(
        new Error("A version with this exact file already exists in this drawing set"),
        { statusCode: 409, code: "DUPLICATE_CHECKSUM" }
      );
    }

    // Get drawing set to resolve org/project
    const drawingSet = await prisma.drawingSet.findUnique({ where: { id: drawingSetId } });
    if (!drawingSet) throw Object.assign(new Error("Drawing set not found"), { statusCode: 404 });

    // Create version record
    const versionRow = await prisma.drawingSetVersion.create({
      data: {
        drawingSetId,
        revisionName: metadata.revisionName,
        revisionNumber: metadata.revisionNumber ?? null,
        issueDate: metadata.issueDate ? new Date(metadata.issueDate) : null,
        receivedDate: metadata.receivedDate ? new Date(metadata.receivedDate) : null,
        description: metadata.description ?? null,
        sourceFilename: filename,
        checksum,
        uploadedBy: actor.userId,
        status: "processing",
      },
    });

    // Store PDF — key includes checksum so it's content-addressed and immutable
    const storage = getArtifactStorage();
    const key = pdfKey(drawingSet.organizationId, drawingSet.projectId, drawingSetId, versionRow.id, checksum);
    await storage.put(key, file, "application/pdf");

    // Update version with pdfKey
    await prisma.drawingSetVersion.update({
      where: { id: versionRow.id },
      data: { pdfKey: key },
    });

    // Enqueue ingest job
    const jobSvc = getJobService();
    await jobSvc.enqueue(
      { type: "version-ingest", versionId: versionRow.id },
      {
        organizationId: drawingSet.organizationId,
        projectId: drawingSet.projectId,
        drawingSetId,
        versionId: versionRow.id,
      }
    );

    await recordAudit({
      organizationId: drawingSet.organizationId,
      projectId: drawingSet.projectId,
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "version.uploaded",
      aggregateType: "drawing-set-version",
      aggregateId: versionRow.id,
      previousRevision: null,
      resultingRevision: 1,
      patchJson: JSON.stringify({ revisionName: metadata.revisionName, checksum }),
      origin: "online",
      correlationId: randomUUID(),
    });

    // Re-read updated row
    const updated = await prisma.drawingSetVersion.findUnique({ where: { id: versionRow.id } });
    return mapVersion(updated!);
  }

  async confirmCurrentVersion(
    versionId: string,
    actor: Actor,
    expectedRevision: number
  ): Promise<DrawingSetVersion> {
    const version = await prisma.drawingSetVersion.findUnique({ where: { id: versionId } });
    if (!version) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
    if (version.status !== "ready") {
      throw Object.assign(
        new Error(`Version must be in 'ready' state, current: ${version.status}`),
        { statusCode: 409, code: "VERSION_NOT_READY" }
      );
    }
    if (version.revision !== expectedRevision) {
      throw Object.assign(
        new Error(`Optimistic concurrency conflict: expected revision ${expectedRevision}, got ${version.revision}`),
        { statusCode: 409, code: "CONFLICT" }
      );
    }

    const drawingSet = await prisma.drawingSet.findUnique({ where: { id: version.drawingSetId } });
    if (!drawingSet) throw Object.assign(new Error("Drawing set not found"), { statusCode: 404 });

    // Transactional: supersede old current, set new current
    await prisma.$transaction(async (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      if (drawingSet.currentVersionId) {
        await tx.drawingSetVersion.update({
          where: { id: drawingSet.currentVersionId },
          data: { status: "superseded", revision: { increment: 1 } },
        });
      }
      await tx.drawingSetVersion.update({
        where: { id: versionId },
        data: { status: "current", revision: { increment: 1 } },
      });
      await tx.drawingSet.update({
        where: { id: drawingSet.id },
        data: { currentVersionId: versionId },
      });
    });

    await recordAudit({
      organizationId: drawingSet.organizationId,
      projectId: drawingSet.projectId,
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "version.confirmed-current",
      aggregateType: "drawing-set-version",
      aggregateId: versionId,
      previousRevision: expectedRevision,
      resultingRevision: expectedRevision + 1,
      patchJson: null,
      origin: "online",
      correlationId: randomUUID(),
    });

    const updated = await prisma.drawingSetVersion.findUnique({ where: { id: versionId } });
    return mapVersion(updated!);
  }

  async retryVersion(versionId: string, actor: Actor): Promise<DrawingSetVersion> {
    const version = await prisma.drawingSetVersion.findUnique({ where: { id: versionId } });
    if (!version) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
    if (version.status !== "failed") {
      throw Object.assign(
        new Error("Only failed versions can be retried"),
        { statusCode: 409 }
      );
    }

    await prisma.drawingSetVersion.update({
      where: { id: versionId },
      data: { status: "processing", processingError: null, revision: { increment: 1 } },
    });

    const drawingSet = await prisma.drawingSet.findUnique({ where: { id: version.drawingSetId } });
    const jobSvc = getJobService();
    await jobSvc.enqueue(
      { type: "version-ingest", versionId },
      {
        organizationId: drawingSet?.organizationId ?? "",
        projectId: drawingSet?.projectId ?? "",
        drawingSetId: version.drawingSetId,
        versionId,
      }
    );

    const updated = await prisma.drawingSetVersion.findUnique({ where: { id: versionId } });
    return mapVersion(updated!);
  }

  async archiveVersion(versionId: string, actor: Actor): Promise<DrawingSetVersion> {
    const version = await prisma.drawingSetVersion.findUnique({ where: { id: versionId } });
    if (!version) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
    if (version.status === "current") {
      throw Object.assign(
        new Error("Cannot archive the current version; confirm a different version first"),
        { statusCode: 409 }
      );
    }

    await prisma.drawingSetVersion.update({
      where: { id: versionId },
      data: { status: "archived", revision: { increment: 1 } },
    });

    const updated = await prisma.drawingSetVersion.findUnique({ where: { id: versionId } });
    return mapVersion(updated!);
  }

  async getVersion(versionId: string, _actorId: string): Promise<DrawingSetVersion> {
    const row = await prisma.drawingSetVersion.findUnique({ where: { id: versionId } });
    if (!row) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
    return mapVersion(row);
  }

  async listVersions(drawingSetId: string, _actorId: string): Promise<DrawingSetVersion[]> {
    const rows = await prisma.drawingSetVersion.findMany({
      where: { drawingSetId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapVersion);
  }

  async listPageVersions(versionId: string): Promise<DrawingPageVersion[]> {
    const rows = await prisma.drawingPageVersion.findMany({
      where: { versionId },
      orderBy: { pageIndex: "asc" },
    });
    return rows.map(mapPageVersion);
  }

  async updatePageVersion(
    pageVersionId: string,
    update: {
      sheetNumber?: string;
      sheetTitle?: string;
      discipline?: string;
      revisionLabel?: string;
      revisionDate?: string;
    },
    expectedRevision: number,
    actor: Actor
  ): Promise<DrawingPageVersion> {
    const existing = await prisma.drawingPageVersion.findUnique({ where: { id: pageVersionId } });
    if (!existing) throw Object.assign(new Error("Page version not found"), { statusCode: 404 });
    if (existing.revision !== expectedRevision) {
      throw Object.assign(new Error("Optimistic concurrency conflict"), { statusCode: 409 });
    }

    const updated = await prisma.drawingPageVersion.update({
      where: { id: pageVersionId },
      data: {
        sheetNumber: update.sheetNumber,
        sheetTitle: update.sheetTitle,
        discipline: update.discipline,
        revisionLabel: update.revisionLabel,
        revisionDate: update.revisionDate ? new Date(update.revisionDate) : undefined,
        userConfirmedMetadata: true,
        revision: { increment: 1 },
      },
    });

    void actor; // audit would go here
    return mapPageVersion(updated);
  }
}
