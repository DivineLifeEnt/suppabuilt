import type { NormalizedBounds } from "@/lib/markup/types";

export type MergeableRegion = {
  bounds: NormalizedBounds;
  kind: "added" | "removed" | "changed";
  changedPixelCount: number;
  strength: number;
};

/**
 * Compute Intersection over Union (IoU) of two NormalizedBounds.
 */
function iou(a: NormalizedBounds, b: NormalizedBounds): number {
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(a.x + a.width, b.x + b.width);
  const iy2 = Math.min(a.y + a.height, b.y + b.height);

  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const interArea = iw * ih;

  if (interArea === 0) return 0;

  const unionArea = a.width * a.height + b.width * b.height - interArea;
  if (unionArea <= 0) return 0;

  return interArea / unionArea;
}

/**
 * Merge two bounds into the smallest enclosing bounds.
 */
function mergeBounds(a: NormalizedBounds, b: NormalizedBounds): NormalizedBounds {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/**
 * Merge overlapping/adjacent regions across tile boundaries.
 * Regions with IoU > 0.3 are merged: larger bounds, summed changedPixelCount, mean strength.
 * Kind is preserved from the region with the larger changedPixelCount.
 */
export function mergeOverlappingRegions(
  regions: MergeableRegion[]
): MergeableRegion[] {
  if (regions.length === 0) return [];

  // Work with mutable copies
  const result: MergeableRegion[] = regions.map((r) => ({ ...r }));
  const merged = new Array(result.length).fill(false);

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < result.length; i++) {
      if (merged[i]) continue;
      for (let j = i + 1; j < result.length; j++) {
        if (merged[j]) continue;
        if (iou(result[i].bounds, result[j].bounds) > 0.3) {
          // Merge j into i
          const totalPx = result[i].changedPixelCount + result[j].changedPixelCount;
          const meanStrength =
            (result[i].strength * result[i].changedPixelCount +
              result[j].strength * result[j].changedPixelCount) /
            totalPx;
          const kind =
            result[i].changedPixelCount >= result[j].changedPixelCount
              ? result[i].kind
              : result[j].kind;

          result[i] = {
            bounds: mergeBounds(result[i].bounds, result[j].bounds),
            kind,
            changedPixelCount: totalPx,
            strength: meanStrength,
          };
          merged[j] = true;
          changed = true;
        }
      }
    }
  }

  return result.filter((_, i) => !merged[i]);
}
