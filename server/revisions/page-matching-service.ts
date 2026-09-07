import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { recordAudit } from "@/server/collaboration/audit-service";
import { proposeMatches } from "@/lib/revisions/page-matching";
import { mapPageVersion } from "./drawing-version-service";
import type { PageMatch } from "@/lib/revisions/types";
import type { PageMatchUpdateInput } from "@/lib/revisions/schemas";

type Actor = { userId: string; orgId: string; name: string };

function mapPageMatch(row: {
  id: string;
  baseVersionId: string;
  comparisonVersionId: string;
  drawingSetId: string;
  basePageId: string | null;
  comparisonPageId: string | null;
  status: string;
  confidence: number;
  matchReasonsJson: string;
  userConfirmed: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): PageMatch {
  let matchReasons: string[] = [];
  try {
    matchReasons = JSON.parse(row.matchReasonsJson) as string[];
  } catch {
    matchReasons = [];
  }
  return {
    id: row.id,
    baseVersionId: row.baseVersionId,
    comparisonVersionId: row.comparisonVersionId,
    drawingSetId: row.drawingSetId,
    basePageId: row.basePageId,
    comparisonPageId: row.comparisonPageId,
    status: row.status as PageMatch["status"],
    confidence: row.confidence,
    matchReasons,
    userConfirmed: row.userConfirmed,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PageMatchingService {
  async proposeMatches(
    baseVersionId: string,
    compVersionId: string,
    actor: Actor
  ): Promise<PageMatch[]> {
    const basePages = await prisma.drawingPageVersion.findMany({
      where: { versionId: baseVersionId },
      orderBy: { pageIndex: "asc" },
    });
    const compPages = await prisma.drawingPageVersion.findMany({
      where: { versionId: compVersionId },
      orderBy: { pageIndex: "asc" },
    });

    const basePagesTyped = basePages.map(mapPageVersion);
    const compPagesTyped = compPages.map(mapPageVersion);

    const proposals = proposeMatches(basePagesTyped, compPagesTyped);

    // Get drawingSetId
    const baseVersion = await prisma.drawingSetVersion.findUnique({
      where: { id: baseVersionId },
    });
    const drawingSetId = baseVersion?.drawingSetId ?? "";

    // Delete non-confirmed existing matches
    const existingConfirmed = await prisma.pageMatch.findMany({
      where: {
        baseVersionId,
        comparisonVersionId: compVersionId,
        userConfirmed: true,
      },
    });
    const confirmedBaseIds = new Set(
      (existingConfirmed as Array<{ basePageId: string | null }>).map((m) => m.basePageId).filter(Boolean)
    );
    const confirmedCompIds = new Set(
      (existingConfirmed as Array<{ comparisonPageId: string | null }>).map((m) => m.comparisonPageId).filter(Boolean)
    );

    await prisma.pageMatch.deleteMany({
      where: {
        baseVersionId,
        comparisonVersionId: compVersionId,
        userConfirmed: false,
      },
    });

    const created: PageMatch[] = [];

    for (const p of proposals) {
      // Skip if this base or comp page is already covered by a confirmed match
      if (p.basePageId && confirmedBaseIds.has(p.basePageId)) continue;
      if (p.comparisonPageId && confirmedCompIds.has(p.comparisonPageId)) continue;

      const row = await prisma.pageMatch.create({
        data: {
          baseVersionId,
          comparisonVersionId: compVersionId,
          drawingSetId,
          basePageId: p.basePageId,
          comparisonPageId: p.comparisonPageId,
          status: p.status,
          confidence: p.confidence,
          matchReasonsJson: JSON.stringify(p.matchReasons),
        },
      });
      created.push(mapPageMatch(row));
    }

    void actor;
    return created;
  }

  async listMatches(baseVersionId: string, compVersionId: string): Promise<PageMatch[]> {
    const rows = await prisma.pageMatch.findMany({
      where: { baseVersionId, comparisonVersionId: compVersionId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapPageMatch);
  }

  async getMatch(matchId: string): Promise<PageMatch> {
    const row = await prisma.pageMatch.findUnique({ where: { id: matchId } });
    if (!row) throw Object.assign(new Error("Page match not found"), { statusCode: 404 });
    return mapPageMatch(row);
  }

  async updateMatch(
    matchId: string,
    update: PageMatchUpdateInput,
    actor: Actor
  ): Promise<PageMatch> {
    const existing = await prisma.pageMatch.findUnique({ where: { id: matchId } });
    if (!existing) throw Object.assign(new Error("Page match not found"), { statusCode: 404 });
    if (existing.revision !== update.expectedRevision) {
      throw Object.assign(new Error("Optimistic concurrency conflict"), { statusCode: 409 });
    }

    let status = update.status ?? existing.status;

    // If user explicitly sets both page IDs and status stays ambiguous, mark manually-matched
    if (
      update.basePageId !== undefined &&
      update.comparisonPageId !== undefined &&
      update.basePageId !== null &&
      update.comparisonPageId !== null &&
      status === "ambiguous"
    ) {
      status = "manually-matched";
    }

    const updated = await prisma.pageMatch.update({
      where: { id: matchId },
      data: {
        status,
        basePageId: update.basePageId !== undefined ? update.basePageId : undefined,
        comparisonPageId: update.comparisonPageId !== undefined ? update.comparisonPageId : undefined,
        userConfirmed: update.userConfirmed ?? existing.userConfirmed,
        revision: { increment: 1 },
      },
    });

    void actor;
    return mapPageMatch(updated);
  }

  async finalizeMatches(
    baseVersionId: string,
    compVersionId: string,
    actor: Actor
  ): Promise<PageMatch[]> {
    const matches = await prisma.pageMatch.findMany({
      where: { baseVersionId, comparisonVersionId: compVersionId },
    });

    type MatchRow = { id: string; status: string; userConfirmed: boolean };
    // Check no ambiguous remain
    const ambiguous = (matches as MatchRow[]).filter((m) => m.status === "ambiguous");
    if (ambiguous.length > 0) {
      throw Object.assign(
        new Error(`${ambiguous.length} ambiguous matches remain; resolve them before finalizing`),
        { statusCode: 422, code: "AMBIGUOUS_MATCHES" }
      );
    }

    // All must be confirmed or explicitly added/removed/unmatched
    const unconfirmed = (matches as MatchRow[]).filter(
      (m) =>
        !m.userConfirmed &&
        m.status !== "added" &&
        m.status !== "removed" &&
        m.status !== "unmatched"
    );
    if (unconfirmed.length > 0) {
      throw Object.assign(
        new Error(`${unconfirmed.length} matches still need confirmation`),
        { statusCode: 422, code: "UNCONFIRMED_MATCHES" }
      );
    }

    // Mark all as confirmed in a transaction
    await prisma.$transaction(
      (matches as MatchRow[]).map((m) =>
        prisma.pageMatch.update({
          where: { id: m.id },
          data: { userConfirmed: true, revision: { increment: 1 } },
        })
      )
    );

    const baseVersion = await prisma.drawingSetVersion.findUnique({
      where: { id: baseVersionId },
    });

    await recordAudit({
      organizationId: actor.orgId,
      projectId: baseVersion?.drawingSetId ?? "",
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "page-matches.finalized",
      aggregateType: "drawing-set-version",
      aggregateId: baseVersionId,
      previousRevision: null,
      resultingRevision: null,
      patchJson: null,
      origin: "online",
      correlationId: randomUUID(),
    });

    const updated = await prisma.pageMatch.findMany({
      where: { baseVersionId, comparisonVersionId: compVersionId },
    });
    return updated.map(mapPageMatch);
  }
}
