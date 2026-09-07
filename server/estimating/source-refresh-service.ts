import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import type { Actor } from "@/lib/estimating/types";
import { recordAudit } from "@/server/collaboration/audit-service";

export type SourceRefreshPreview = {
  added: Array<{ takeoffItemId: string; description: string; quantity: string; unit: string }>;
  removed: Array<{ snapshotId: string; description: string }>;
  changed: Array<{ snapshotId: string; description: string; oldQty: string; newQty: string; oldUnit: string; newUnit: string }>;
  unchanged: number;
};

export class SourceRefreshService {
  /**
   * Preview what would change if we refreshed all source snapshots for this version.
   * Never modifies the estimate.
   */
  async previewRefresh(versionId: string, _actorId: string): Promise<SourceRefreshPreview> {
    const version = await prisma.estimateVersion.findUnique({ where: { id: versionId } });
    if (!version) throw Object.assign(new Error("Version not found"), { statusCode: 404 });

    const lines = await prisma.estimateLine.findMany({
      where: { versionId, sourceSnapshotId: { not: null } },
      include: { snapshot: true },
    });

    const added: SourceRefreshPreview["added"] = [];
    const removed: SourceRefreshPreview["removed"] = [];
    const changed: SourceRefreshPreview["changed"] = [];
    let unchanged = 0;

    for (const line of lines) {
      if (!line.snapshot) continue;

      const currentItem = await prisma.takeoffItem.findUnique({
        where: { id: line.snapshot.takeoffItemId },
        include: { catalogItem: true },
      });

      if (!currentItem) {
        removed.push({ snapshotId: line.snapshot.id, description: line.description });
        continue;
      }

      if (
        currentItem.grossQuantity !== line.snapshot.quantity ||
        currentItem.unit !== line.snapshot.unit
      ) {
        changed.push({
          snapshotId: line.snapshot.id,
          description: line.description,
          oldQty: line.snapshot.quantity,
          newQty: currentItem.grossQuantity,
          oldUnit: line.snapshot.unit,
          newUnit: currentItem.unit,
        });
      } else {
        unchanged++;
      }
    }

    return { added, removed, changed, unchanged };
  }

  /**
   * Apply a refresh: update selected snapshots from current takeoff state.
   * Cannot apply to approved/locked versions.
   */
  async applyRefresh(
    versionId: string,
    selectedItemIds: string[],
    idempotencyKey: string,
    actor: Actor
  ): Promise<void> {
    const version = await prisma.estimateVersion.findUnique({ where: { id: versionId } });
    if (!version) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
    if (version.status === "approved" || version.status === "locked") {
      throw Object.assign(new Error("Cannot refresh approved or locked versions"), { statusCode: 422 });
    }

    const lines = await prisma.estimateLine.findMany({
      where: { versionId, sourceSnapshotId: { not: null } },
      include: { snapshot: true },
    });

    let updated = 0;

    for (const line of lines) {
      if (!line.snapshot) continue;
      if (!selectedItemIds.includes(line.snapshot.id)) continue;

      const currentItem = await prisma.takeoffItem.findUnique({
        where: { id: line.snapshot.takeoffItemId },
      });
      if (!currentItem) continue;

      // Update snapshot
      await prisma.estimateLineSourceSnapshot.update({
        where: { id: line.snapshot.id },
        data: {
          quantity: currentItem.grossQuantity,
          unit: currentItem.unit,
          takeoffRevision: currentItem.revision,
          isStale: false,
        },
      });

      // Update line with new quantity/unit
      await prisma.estimateLine.update({
        where: { id: line.id },
        data: {
          quantity: currentItem.grossQuantity,
          unit: currentItem.unit,
          revision: { increment: 1 },
        },
      });

      updated++;
    }

    await recordAudit({
      organizationId: actor.orgId,
      projectId: await this._getProjectId(versionId),
      sessionId: null,
      actorId: actor.userId,
      actorName: actor.name,
      action: "estimate-version.refresh-applied",
      aggregateType: "EstimateVersion",
      aggregateId: versionId,
      previousRevision: version.revision,
      resultingRevision: version.revision + 1,
      patchJson: JSON.stringify({ updatedSnapshots: updated, idempotencyKey }),
      origin: "online",
      correlationId: randomUUID(),
    });
  }

  private async _getProjectId(versionId: string): Promise<string> {
    const version = await prisma.estimateVersion.findUnique({
      where: { id: versionId },
      include: { estimate: true },
    });
    return version?.estimate?.projectId ?? "unknown";
  }
}
