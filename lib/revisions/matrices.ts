import type { AffineMatrix } from "./types";
import type { NormalizedPoint, NormalizedBounds } from "@/lib/markup/types";

export { type AffineMatrix };

export const IDENTITY_MATRIX: AffineMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export class MatrixSingularError extends Error {
  constructor() {
    super("Matrix is singular or near-singular");
    this.name = "MatrixSingularError";
  }
}

/**
 * Multiply two 3×3 row-major matrices.
 * Convention: p_out = M * p_in, applied as M(p)
 */
export function matMul(a: AffineMatrix, b: AffineMatrix): AffineMatrix {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ];
}

function det3(m: AffineMatrix): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

/**
 * Invert a 3×3 matrix. Throws MatrixSingularError if |det| < 1e-10.
 */
export function matInverse(m: AffineMatrix): AffineMatrix {
  const d = det3(m);
  if (Math.abs(d) < 1e-10) throw new MatrixSingularError();
  const inv = 1 / d;
  return [
    (m[4] * m[8] - m[5] * m[7]) * inv,
    (m[2] * m[7] - m[1] * m[8]) * inv,
    (m[1] * m[5] - m[2] * m[4]) * inv,

    (m[5] * m[6] - m[3] * m[8]) * inv,
    (m[0] * m[8] - m[2] * m[6]) * inv,
    (m[2] * m[3] - m[0] * m[5]) * inv,

    (m[3] * m[7] - m[4] * m[6]) * inv,
    (m[1] * m[6] - m[0] * m[7]) * inv,
    (m[0] * m[4] - m[1] * m[3]) * inv,
  ];
}

/**
 * Transform a 2D point using the matrix.
 * Convention: normalized coords 0..1, origin top-left, y down.
 * p_base = M * p_comparison
 */
export function transformPoint(
  m: AffineMatrix,
  x: number,
  y: number
): [number, number] {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

/**
 * Transform NormalizedBounds (x, y, width, height) through the matrix.
 * Transforms all four corners and returns the axis-aligned bounding box.
 */
export function transformBounds(m: AffineMatrix, bounds: NormalizedBounds): NormalizedBounds {
  const { x, y, width, height } = bounds;
  const corners: [number, number][] = [
    transformPoint(m, x, y),
    transformPoint(m, x + width, y),
    transformPoint(m, x, y + height),
    transformPoint(m, x + width, y + height),
  ];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Compute similarity transform (rotation + uniform scale + translation)
 * that maps two comparison points to two base points.
 * p_base = M * p_comparison
 */
export function twoPointSimilarity(
  base: [NormalizedPoint, NormalizedPoint],
  comparison: [NormalizedPoint, NormalizedPoint]
): AffineMatrix {
  const [b0, b1] = base;
  const [c0, c1] = comparison;

  // Translate comparison to origin
  const dx = c1.x - c0.x;
  const dy = c1.y - c0.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-20) return IDENTITY_MATRIX;

  // Compute scale and rotation: map comparison segment to base segment
  const bx = b1.x - b0.x;
  const by = b1.y - b0.y;

  // a + bi in complex: (bx+i*by) / (dx+i*dy)
  const a = (bx * dx + by * dy) / lenSq;
  const b = (by * dx - bx * dy) / lenSq;

  // Translation: b0 - M*c0
  const tx = b0.x - (a * c0.x - b * c0.y);
  const ty = b0.y - (b * c0.x + a * c0.y);

  return [a, -b, tx, b, a, ty, 0, 0, 1];
}

/**
 * Compute affine transform (6 DOF) mapping three comparison points to three base points.
 * Solves the 2x3 affine system via Cramer's rule.
 * p_base = M * p_comparison
 */
export function threePointAffine(
  base: [NormalizedPoint, NormalizedPoint, NormalizedPoint],
  comparison: [NormalizedPoint, NormalizedPoint, NormalizedPoint]
): AffineMatrix {
  const [c0, c1, c2] = comparison;
  const [b0, b1, b2] = base;

  // Build 3x3 system for x mapping
  // [c0.x c0.y 1] [a]   [b0.x]
  // [c1.x c1.y 1] [b] = [b1.x]
  // [c2.x c2.y 1] [c]   [b2.x]
  const A: AffineMatrix = [c0.x, c0.y, 1, c1.x, c1.y, 1, c2.x, c2.y, 1];
  const d = det3(A);
  if (Math.abs(d) < 1e-20) return IDENTITY_MATRIX;

  const invA = matInverse(A);

  const bXVec = [b0.x, b1.x, b2.x];
  const bYVec = [b0.y, b1.y, b2.y];

  const m00 = invA[0] * bXVec[0] + invA[1] * bXVec[1] + invA[2] * bXVec[2];
  const m01 = invA[3] * bXVec[0] + invA[4] * bXVec[1] + invA[5] * bXVec[2];
  const m02 = invA[6] * bXVec[0] + invA[7] * bXVec[1] + invA[8] * bXVec[2];

  const m10 = invA[0] * bYVec[0] + invA[1] * bYVec[1] + invA[2] * bYVec[2];
  const m11 = invA[3] * bYVec[0] + invA[4] * bYVec[1] + invA[5] * bYVec[2];
  const m12 = invA[6] * bYVec[0] + invA[7] * bYVec[1] + invA[8] * bYVec[2];

  return [m00, m01, m02, m10, m11, m12, 0, 0, 1];
}

/**
 * Check if a matrix is valid (all finite, |det| > 1e-10).
 */
export function isValidMatrix(m: AffineMatrix): boolean {
  for (const v of m) {
    if (!isFinite(v)) return false;
  }
  return Math.abs(det3(m)) > 1e-10;
}

/**
 * Compute mean residual error: mean distance from transformPoint(m, comp) to base.
 */
export function matrixResidualError(
  m: AffineMatrix,
  basePoints: NormalizedPoint[],
  compPoints: NormalizedPoint[]
): number {
  if (basePoints.length === 0) return 0;
  let totalErr = 0;
  const n = Math.min(basePoints.length, compPoints.length);
  for (let i = 0; i < n; i++) {
    const [px, py] = transformPoint(m, compPoints[i].x, compPoints[i].y);
    const dx = px - basePoints[i].x;
    const dy = py - basePoints[i].y;
    totalErr += Math.sqrt(dx * dx + dy * dy);
  }
  return totalErr / n;
}
