import type { AffineMatrix } from "./types";
import { IDENTITY_MATRIX } from "./matrices";

export type { AffineMatrix };

/**
 * Normalize any rotation angle to one of 0|90|180|270.
 */
export function normalizeRotation(rotation: number): 0 | 90 | 180 | 270 {
  const mod = ((rotation % 360) + 360) % 360;
  const rounded = Math.round(mod / 90) * 90;
  const clamped = rounded % 360;
  if (clamped === 0) return 0;
  if (clamped === 90) return 90;
  if (clamped === 180) return 180;
  return 270;
}

/**
 * Compute the matrix that accounts for native page rotation when compositing.
 * Rotation is applied around the page center in normalized 0..1 space.
 *
 * For rotation=0, returns identity (no adjustment needed).
 * For other rotations, returns a matrix that maps un-rotated normalized coords
 * into rotated normalized coords (so the page content lines up).
 */
export function cropBoxMatrix(
  widthPt: number,
  heightPt: number,
  rotation: 0 | 90 | 180 | 270
): AffineMatrix {
  if (rotation === 0) return IDENTITY_MATRIX;

  // Aspect ratio — needed for correct scaling when page is rotated 90/270
  const aspect = widthPt / heightPt;

  if (rotation === 180) {
    // Flip 180° around center (0.5, 0.5)
    return [-1, 0, 1, 0, -1, 1, 0, 0, 1];
  }

  if (rotation === 90) {
    // 90° CW: (x, y) → (y, 1-x) then scale for aspect
    // Normalized: x' = y * aspect, y' = (1-x) / aspect  — simplified to identity scale
    return [0, aspect, 0, -1 / aspect, 0, 1, 0, 0, 1];
  }

  // rotation === 270
  return [0, -aspect, aspect, 1 / aspect, 0, 0, 0, 0, 1];
}

/**
 * Compute alignment quality score from residual error and number of control points.
 * Perfect alignment (residualError=0) → 1.0; degrades as error grows.
 * More control points provide a small bonus.
 */
export function alignmentQualityScore(
  residualError: number,
  pointCount: number
): number {
  // Base score from residual: exponential decay, half-life at ~0.01 normalized units
  const errorScore = Math.exp(-residualError / 0.01);
  // Bonus for more points (max +0.05 for 3 points vs 2)
  const pointBonus = Math.min((pointCount - 2) * 0.025, 0.05);
  return Math.min(1, Math.max(0, errorScore + pointBonus));
}

/**
 * Returns true if the quality score is below acceptable threshold (0.7).
 */
export function isLowConfidence(qualityScore: number): boolean {
  return qualityScore < 0.7;
}
