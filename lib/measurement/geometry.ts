/**
 * Pure geometry functions — no DOM, no React.
 * All coordinates are normalized 0..1 unrotated PDF space.
 */
import type { NormalizedPoint, NormalizedBounds } from "@/lib/markup/types";

export type { NormalizedPoint, NormalizedBounds };

// ─── Distance ─────────────────────────────────────────────────────────────────
export function distance(a: NormalizedPoint, b: NormalizedPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Polyline length ──────────────────────────────────────────────────────────
export function polylineLength(points: NormalizedPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += distance(points[i], points[i + 1]);
  }
  return total;
}

// ─── Perimeter (closed polygon) ───────────────────────────────────────────────
export function perimeter(points: NormalizedPoint[]): number {
  if (points.length < 2) return 0;
  return polylineLength(points) + distance(points[points.length - 1], points[0]);
}

// ─── Polygon area (shoelace) ──────────────────────────────────────────────────
/**
 * Signed area using the shoelace formula. Positive for CCW, negative for CW.
 * Returns 0 for fewer than 3 points.
 */
export function polygonArea(points: NormalizedPoint[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    sum += (curr.x * next.y) - (next.x * curr.y);
  }
  return sum / 2;
}

// ─── Rectangle area ───────────────────────────────────────────────────────────
export function rectangleArea(bounds: NormalizedBounds): number {
  return bounds.width * bounds.height;
}

// ─── Volume ───────────────────────────────────────────────────────────────────
export function volume(areaMm2: number, depthMm: number): number {
  return areaMm2 * depthMm;
}

// ─── Circle radius ────────────────────────────────────────────────────────────
export function circleRadius(center: NormalizedPoint, edge: NormalizedPoint): number {
  return distance(center, edge);
}

// ─── Interior angle ───────────────────────────────────────────────────────────
/**
 * Interior angle at `vertex` formed by vectors vertex→a and vertex→b.
 * Returns degrees in range [0, 360].
 */
export function interiorAngle(
  vertex: NormalizedPoint,
  a: NormalizedPoint,
  b: NormalizedPoint
): number {
  const ax = a.x - vertex.x;
  const ay = a.y - vertex.y;
  const bx = b.x - vertex.x;
  const by = b.y - vertex.y;

  const dot = ax * bx + ay * by;
  const lenA = Math.sqrt(ax * ax + ay * ay);
  const lenB = Math.sqrt(bx * bx + by * by);

  if (lenA === 0 || lenB === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

// ─── Midpoint ─────────────────────────────────────────────────────────────────
export function midpoint(a: NormalizedPoint, b: NormalizedPoint): NormalizedPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ─── Point-to-segment distance ────────────────────────────────────────────────
export function pointToSegmentDistance(
  pt: NormalizedPoint,
  a: NormalizedPoint,
  b: NormalizedPoint
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = pt.x - a.x;
    const ey = pt.y - a.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
  const cx = a.x + t * dx - pt.x;
  const cy = a.y + t * dy - pt.y;
  return Math.sqrt(cx * cx + cy * cy);
}

// ─── Segment intersection ─────────────────────────────────────────────────────
export function segmentIntersection(
  a1: NormalizedPoint,
  a2: NormalizedPoint,
  b1: NormalizedPoint,
  b2: NormalizedPoint
): NormalizedPoint | null {
  const dx1 = a2.x - a1.x;
  const dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x;
  const dy2 = b2.y - b1.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-12) return null; // parallel

  const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
  const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return {
    x: a1.x + t * dx1,
    y: a1.y + t * dy1,
  };
}

// ─── Angle constraint (snap to multiple) ─────────────────────────────────────
/**
 * Project `pt` onto the nearest angle multiple from `origin`.
 * angleDeg is the snap increment (e.g. 45 → snaps to 0°, 45°, 90°, …).
 */
export function constrainAngle(
  origin: NormalizedPoint,
  pt: NormalizedPoint,
  angleDeg: number
): NormalizedPoint {
  const dx = pt.x - origin.x;
  const dy = pt.y - origin.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return pt;

  const rawAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  const snapped = Math.round(rawAngle / angleDeg) * angleDeg;
  const rad = snapped * (Math.PI / 180);

  return {
    x: origin.x + Math.cos(rad) * len,
    y: origin.y + Math.sin(rad) * len,
  };
}

// ─── Self-intersection check ──────────────────────────────────────────────────
/**
 * Returns true if any two non-adjacent segments of the polygon intersect.
 */
export function isSelfIntersecting(points: NormalizedPoint[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];

    for (let j = i + 2; j < n; j++) {
      // Skip adjacent segments: last segment is adjacent to the first
      if (i === 0 && j === n - 1) continue;

      const b1 = points[j];
      const b2 = points[(j + 1) % n];

      if (segmentIntersection(a1, a2, b1, b2) !== null) return true;
    }
  }
  return false;
}

// ─── Bounding box ─────────────────────────────────────────────────────────────
export function pointsBoundingBox(points: NormalizedPoint[]): NormalizedBounds {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─── Validation helpers ───────────────────────────────────────────────────────
export function isValidNormalizedPoint(pt: NormalizedPoint): boolean {
  return (
    typeof pt.x === "number" &&
    typeof pt.y === "number" &&
    isFinite(pt.x) &&
    isFinite(pt.y) &&
    pt.x >= 0 &&
    pt.x <= 1 &&
    pt.y >= 0 &&
    pt.y <= 1
  );
}

export function validatePolygon(points: NormalizedPoint[]): { valid: boolean; error?: string } {
  if (points.length < 3) return { valid: false, error: "Polygon requires at least 3 points" };

  for (const pt of points) {
    if (!isValidNormalizedPoint(pt)) {
      return { valid: false, error: "Point coordinates must be in 0..1 range" };
    }
  }

  if (isSelfIntersecting(points)) {
    return { valid: false, error: "Polygon cannot self-intersect" };
  }

  return { valid: true };
}

// ─── Polygon centroid ─────────────────────────────────────────────────────────
export function polygonCentroid(points: NormalizedPoint[]): NormalizedPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  const area = polygonArea(points);
  if (Math.abs(area) < 1e-12) {
    // Degenerate — fall back to average
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    return { x: cx, y: cy };
  }

  let cx = 0;
  let cy = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    const cross = curr.x * next.y - next.x * curr.y;
    cx += (curr.x + next.x) * cross;
    cy += (curr.y + next.y) * cross;
  }
  const factor = 1 / (6 * area);
  return { x: cx * factor, y: cy * factor };
}
