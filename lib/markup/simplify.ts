import type { NormalizedPoint } from "./types";

/**
 * Douglas-Peucker polyline simplification.
 * Reduces a path to at most maxPoints points while preserving shape.
 */
export function douglasPeucker(
  points: NormalizedPoint[],
  epsilon: number
): NormalizedPoint[] {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance from the line start-end
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function perpendicularDistance(
  point: NormalizedPoint,
  lineStart: NormalizedPoint,
  lineEnd: NormalizedPoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
    );
  }
  return (
    Math.abs(
      dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    ) / len
  );
}

/** Simplify a path until it has at most maxPoints points. */
export function simplifyPath(
  points: NormalizedPoint[],
  maxPoints: number
): NormalizedPoint[] {
  if (points.length <= maxPoints) return points;

  // Binary search on epsilon to find the right level of simplification
  let lo = 0;
  let hi = 1;
  let result = points;

  for (let iter = 0; iter < 20; iter++) {
    const mid = (lo + hi) / 2;
    const simplified = douglasPeucker(points, mid);
    if (simplified.length <= maxPoints) {
      result = simplified;
      hi = mid;
    } else {
      lo = mid;
    }
    if (Math.abs(simplified.length - maxPoints) <= 1) break;
  }

  return result;
}
