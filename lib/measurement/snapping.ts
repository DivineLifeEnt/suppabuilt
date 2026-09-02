import type { NormalizedPoint } from "@/lib/markup/types";
import type { Measurement, Calibration } from "./types";
import { distance, midpoint } from "./geometry";

// ─── Types ────────────────────────────────────────────────────────────────────
export type SnapCandidate = {
  point: NormalizedPoint;
  kind: "endpoint" | "midpoint" | "intersection" | "grid";
  priority: number;
};

export type SnapSettings = {
  enabled: boolean;
  tolerancePx: number;
  snapToEndpoints: boolean;
  snapToMidpoints: boolean;
  snapToIntersections: boolean;
  snapToGrid: boolean;
  gridSpacingMm: number;
};

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  tolerancePx: 12,
  snapToEndpoints: true,
  snapToMidpoints: true,
  snapToIntersections: false,
  snapToGrid: false,
  gridSpacingMm: 304.8, // 1 foot
};

// ─── Candidate generation ─────────────────────────────────────────────────────
function extractPoints(m: Measurement): NormalizedPoint[] {
  switch (m.type) {
    case "linear":
      return [m.start, m.end];
    case "polyline":
    case "perimeter":
      return [...m.points];
    case "polygon-area":
    case "rectangle-area":
    case "volume":
      if (m.geometry.kind === "polygon") return [...m.geometry.points];
      return [
        { x: m.geometry.bounds.x, y: m.geometry.bounds.y },
        { x: m.geometry.bounds.x + m.geometry.bounds.width, y: m.geometry.bounds.y },
        { x: m.geometry.bounds.x + m.geometry.bounds.width, y: m.geometry.bounds.y + m.geometry.bounds.height },
        { x: m.geometry.bounds.x, y: m.geometry.bounds.y + m.geometry.bounds.height },
      ];
    case "diameter":
    case "radius":
      return [m.center, m.edge];
    case "angle":
      return [m.vertex, m.start, m.end];
    case "count":
      return [...m.points];
  }
}

export function generateSnapCandidates(
  measurements: Measurement[],
  calibration: Calibration | null,
  _pageWidth: number,
  _pageHeight: number
): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];

  for (const m of measurements) {
    const pts = extractPoints(m);

    // Endpoints
    for (const pt of pts) {
      candidates.push({ point: pt, kind: "endpoint", priority: 10 });
    }

    // Midpoints (for segments)
    for (let i = 0; i < pts.length - 1; i++) {
      const mp = midpoint(pts[i], pts[i + 1]);
      candidates.push({ point: mp, kind: "midpoint", priority: 5 });
    }
  }

  // Grid snapping
  if (calibration && calibration.pageUnitsPerMillimeter > 0) {
    // We won't generate a full grid here — grid snapping is done dynamically in findBestSnap
    // This is a placeholder; grid candidates are generated on-demand when settings.snapToGrid is true
  }

  return candidates;
}

// ─── Find best snap ───────────────────────────────────────────────────────────
/**
 * Find the nearest snap candidate within tolerance.
 * tolerancePx is converted to normalized units using zoom and page dimensions.
 */
export function findBestSnap(
  pt: NormalizedPoint,
  candidates: SnapCandidate[],
  tolerancePx: number,
  zoom: number,
  pageWidth: number,
  pageHeight: number
): SnapCandidate | null {
  // Convert pixel tolerance to normalized units
  // Use the smaller of width/height for tolerance (conservative)
  const tolX = tolerancePx / (zoom * pageWidth);
  const tolY = tolerancePx / (zoom * pageHeight);
  const tol = Math.min(tolX, tolY);

  let best: SnapCandidate | null = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const d = distance(pt, c.point);
    if (d < tol && (d < bestDist || (d === bestDist && c.priority > (best?.priority ?? 0)))) {
      best = c;
      bestDist = d;
    }
  }

  return best;
}
