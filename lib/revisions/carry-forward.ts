import type { NormalizedPoint, NormalizedBounds } from "@/lib/markup/types";
import type { AffineMatrix } from "./types";
import { transformPoint } from "./matrices";

/**
 * Transform a NormalizedPoint through an alignment matrix.
 * p_base = M * p_comparison (same convention as matrices.ts)
 */
export function transformNormalizedPoint(
  pt: NormalizedPoint,
  matrix: AffineMatrix
): NormalizedPoint {
  const [x, y] = transformPoint(matrix, pt.x, pt.y);
  return { x, y };
}

/**
 * Transform NormalizedBounds through an alignment matrix.
 * Transforms all four corners, returns axis-aligned bounding box.
 */
export function transformNormalizedBounds(
  bounds: NormalizedBounds,
  matrix: AffineMatrix
): NormalizedBounds {
  const { x, y, width, height } = bounds;
  const corners: NormalizedPoint[] = [
    transformNormalizedPoint({ x, y }, matrix),
    transformNormalizedPoint({ x: x + width, y }, matrix),
    transformNormalizedPoint({ x, y: y + height }, matrix),
    transformNormalizedPoint({ x: x + width, y: y + height }, matrix),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Check if bounds fall entirely within [0,1] page space.
 * Returns false if any part extends outside the 0..1 range.
 */
export function isInBounds(bounds: NormalizedBounds): boolean {
  return (
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.x + bounds.width <= 1 &&
    bounds.y + bounds.height <= 1 &&
    bounds.width >= 0 &&
    bounds.height >= 0
  );
}

/**
 * Check calibration compatibility.
 * Two calibrations are compatible if their pageUnitsPerMillimeter values are within 1% of each other.
 * Returns false if newCalib is null.
 */
export function calibrationCompatible(
  oldCalib: { pageUnitsPerMillimeter: number },
  newCalib: { pageUnitsPerMillimeter: number } | null
): boolean {
  if (!newCalib) return false;
  const ratio =
    Math.abs(oldCalib.pageUnitsPerMillimeter - newCalib.pageUnitsPerMillimeter) /
    Math.max(Math.abs(oldCalib.pageUnitsPerMillimeter), 1e-10);
  return ratio <= 0.01;
}
