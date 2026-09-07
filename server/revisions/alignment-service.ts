import { prisma } from "@/server/db";
import {
  IDENTITY_MATRIX,
  twoPointSimilarity,
  threePointAffine,
  matrixResidualError,
  isValidMatrix,
} from "@/lib/revisions/matrices";
import { alignmentQualityScore } from "@/lib/revisions/alignment";
import type { PageAlignment, AffineMatrix } from "@/lib/revisions/types";
import type { AlignmentPointsInput } from "@/lib/revisions/schemas";

type Actor = { userId: string; orgId: string; name: string };

function mapAlignment(row: {
  id: string;
  pageMatchId: string;
  method: string;
  matrixJson: string;
  qualityScore: number | null;
  residualError: number | null;
  userConfirmed: boolean;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): PageAlignment {
  let matrix: AffineMatrix = IDENTITY_MATRIX;
  try {
    const arr = JSON.parse(row.matrixJson) as number[];
    if (arr.length === 9) {
      matrix = arr as unknown as AffineMatrix;
    }
  } catch {
    matrix = IDENTITY_MATRIX;
  }
  return {
    id: row.id,
    pageMatchId: row.pageMatchId,
    method: row.method as PageAlignment["method"],
    matrix,
    qualityScore: row.qualityScore,
    residualError: row.residualError,
    userConfirmed: row.userConfirmed,
    confirmedBy: row.confirmedBy,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class AlignmentService {
  async getOrCreateIdentityAlignment(pageMatchId: string): Promise<PageAlignment> {
    const existing = await prisma.pageAlignment.findFirst({
      where: { pageMatchId },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return mapAlignment(existing);

    const row = await prisma.pageAlignment.create({
      data: {
        pageMatchId,
        method: "identity",
        matrixJson: JSON.stringify([...IDENTITY_MATRIX]),
        qualityScore: 1.0,
        residualError: 0,
        userConfirmed: false,
      },
    });
    return mapAlignment(row);
  }

  async getAlignment(pageMatchId: string): Promise<PageAlignment | null> {
    const row = await prisma.pageAlignment.findFirst({
      where: { pageMatchId },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapAlignment(row) : null;
  }

  async computeAutoAlignment(pageMatchId: string, _actor: Actor): Promise<PageAlignment> {
    // Attempt feature-based alignment using image correlation
    // For now, create identity alignment (actual feature matching would require more infrastructure)
    const match = await prisma.pageMatch.findUnique({
      where: { id: pageMatchId },
      include: { basePage: true, comparisonPage: true },
    });
    if (!match) throw Object.assign(new Error("Page match not found"), { statusCode: 404 });

    // Simple approach: if pages have same dimensions, identity. Otherwise try scale adjustment.
    let matrix: AffineMatrix = IDENTITY_MATRIX;
    let qualityScore = 0.8;
    let residualError = 0.0;

    if (match.basePage && match.comparisonPage) {
      const bw = match.basePage.widthPt;
      const bh = match.basePage.heightPt;
      const cw = match.comparisonPage.widthPt;
      const ch = match.comparisonPage.heightPt;

      if (Math.abs(bw - cw) > 1 || Math.abs(bh - ch) > 1) {
        // Scale comparison to base dimensions
        const sx = bw / cw;
        const sy = bh / ch;
        matrix = [sx, 0, 0, 0, sy, 0, 0, 0, 1];
        residualError = Math.abs(sx - 1) * 0.1 + Math.abs(sy - 1) * 0.1;
        qualityScore = alignmentQualityScore(residualError, 2);
      } else {
        qualityScore = 1.0;
        residualError = 0;
      }
    }

    // Delete any existing auto alignment and create new one
    await prisma.pageAlignment.deleteMany({
      where: { pageMatchId, userConfirmed: false, method: "auto" },
    });

    const row = await prisma.pageAlignment.create({
      data: {
        pageMatchId,
        method: "auto",
        matrixJson: JSON.stringify([...matrix]),
        qualityScore,
        residualError,
        userConfirmed: false,
      },
    });
    return mapAlignment(row);
  }

  async setManualAlignment(
    pageMatchId: string,
    input: AlignmentPointsInput,
    actor: Actor
  ): Promise<PageAlignment> {
    const { basePoints, comparisonPoints } = input;

    if (basePoints.length !== comparisonPoints.length) {
      throw Object.assign(
        new Error("basePoints and comparisonPoints must have the same length"),
        { statusCode: 400 }
      );
    }

    let matrix: AffineMatrix;
    let method: "two-point" | "three-point";

    if (basePoints.length === 2) {
      method = "two-point";
      matrix = twoPointSimilarity(
        [basePoints[0], basePoints[1]],
        [comparisonPoints[0], comparisonPoints[1]]
      );
    } else if (basePoints.length >= 3) {
      method = "three-point";
      matrix = threePointAffine(
        [basePoints[0], basePoints[1], basePoints[2]],
        [comparisonPoints[0], comparisonPoints[1], comparisonPoints[2]]
      );
    } else {
      throw Object.assign(new Error("At least 2 control points required"), { statusCode: 400 });
    }

    if (!isValidMatrix(matrix)) {
      throw Object.assign(
        new Error("Resulting alignment matrix is singular or contains non-finite values"),
        { statusCode: 422, code: "INVALID_MATRIX" }
      );
    }

    const residualError = matrixResidualError(matrix, basePoints, comparisonPoints);
    const qualityScore = alignmentQualityScore(residualError, basePoints.length);

    // Remove old unconfirmed manual alignment
    await prisma.pageAlignment.deleteMany({
      where: { pageMatchId, userConfirmed: false, method: { in: ["two-point", "three-point", "manual"] } },
    });

    const row = await prisma.pageAlignment.create({
      data: {
        pageMatchId,
        method,
        matrixJson: JSON.stringify([...matrix]),
        qualityScore,
        residualError,
        userConfirmed: false,
      },
    });

    void actor;
    return mapAlignment(row);
  }

  async confirmAlignment(alignmentId: string, actor: Actor): Promise<PageAlignment> {
    const existing = await prisma.pageAlignment.findUnique({ where: { id: alignmentId } });
    if (!existing) throw Object.assign(new Error("Alignment not found"), { statusCode: 404 });

    const updated = await prisma.pageAlignment.update({
      where: { id: alignmentId },
      data: {
        userConfirmed: true,
        confirmedBy: actor.userId,
        confirmedAt: new Date(),
        revision: { increment: 1 },
      },
    });
    return mapAlignment(updated);
  }

  async previewAlignment(pageMatchId: string): Promise<{ previewKey: string }> {
    // In production, this would generate a preview composite image
    // Return a placeholder key for now
    return { previewKey: `previews/${pageMatchId}/alignment-preview.png` };
  }
}
