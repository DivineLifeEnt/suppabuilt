import type {
  NormalizedPoint,
  NormalizedBounds,
  ScreenPoint,
  Markup,
} from "./types";

// ─── Core coordinate conversions ──────────────────────────────────────────────

/**
 * Convert screen pixel point to normalized 0..1 PDF coordinates.
 * canvasRect is the bounding rect of the rendered PDF canvas element.
 * rotation is 0/90/180/270 — the current display rotation.
 * pageWidth/Height are the unrotated page dimensions in PDF user units.
 */
export function screenToNormalized(
  screenPt: ScreenPoint,
  canvasRect: DOMRect,
  zoom: number,
  rotation: number,
  pageWidth: number,
  pageHeight: number
): NormalizedPoint {
  // Convert screen → canvas-local pixels (accounting for zoom)
  const localX = (screenPt.x - canvasRect.left) / zoom;
  const localY = (screenPt.y - canvasRect.top) / zoom;

  // At the given rotation the canvas dimensions are swapped for 90/270
  const canvasW = canvasRect.width / zoom;
  const canvasH = canvasRect.height / zoom;

  // Normalize to 0..1 within the rotated canvas
  const nx = localX / canvasW;
  const ny = localY / canvasH;

  // Unrotate to get back to PDF coordinate space (0..1 unrotated)
  return unrotateNorm({ x: nx, y: ny }, rotation);
}

/**
 * Convert normalized 0..1 unrotated PDF point to screen pixel coordinates.
 */
export function normalizedToScreen(
  normalPt: NormalizedPoint,
  canvasRect: DOMRect,
  zoom: number,
  rotation: number,
  _pageWidth: number,
  _pageHeight: number
): ScreenPoint {
  // Rotate the normalised point to the display orientation
  const rotated = rotateNorm(normalPt, rotation);

  const canvasW = canvasRect.width / zoom;
  const canvasH = canvasRect.height / zoom;

  return {
    x: canvasRect.left + rotated.x * canvasW * zoom,
    y: canvasRect.top + rotated.y * canvasH * zoom,
  };
}

// ─── Bounds helpers ───────────────────────────────────────────────────────────

/**
 * Given two normalised anchor/end points produce a canonical bounds
 * (x, y are the top-left; width/height are non-negative).
 */
export function normalizeBounds(
  start: NormalizedPoint,
  end: NormalizedPoint
): NormalizedBounds {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

// ─── Rotation helpers ─────────────────────────────────────────────────────────

/**
 * Rotate a normalised point by the given display rotation (0/90/180/270).
 * This maps unrotated PDF coords → rotated display coords (0..1 in display space).
 */
export function rotateNorm(
  pt: NormalizedPoint,
  rotation: number
): NormalizedPoint {
  const deg = ((rotation % 360) + 360) % 360;
  const { x, y } = pt;
  switch (deg) {
    case 90:
      return { x: y, y: 1 - x };
    case 180:
      return { x: 1 - x, y: 1 - y };
    case 270:
      return { x: 1 - y, y: x };
    default:
      return { x, y };
  }
}

/**
 * Unrotate a normalised point from display space back to unrotated PDF coords.
 */
export function unrotateNorm(
  pt: NormalizedPoint,
  rotation: number
): NormalizedPoint {
  // Unrotating by R is the same as rotating by -R (i.e. 360-R)
  const opposite = (360 - ((rotation % 360) + 360) % 360) % 360;
  return rotateNorm(pt, opposite);
}

/**
 * Legacy named exports matching the spec — wrap the normalised helpers with
 * page-dimension arguments (unused when working in 0..1 space, but kept for
 * API compatibility).
 */
export function rotatePt(
  pt: NormalizedPoint,
  rotation: number,
  _pageDims: { width: number; height: number }
): NormalizedPoint {
  return rotateNorm(pt, rotation);
}

export function unrotatePt(
  pt: NormalizedPoint,
  rotation: number,
  _pageDims: { width: number; height: number }
): NormalizedPoint {
  return unrotateNorm(pt, rotation);
}

// ─── Hit testing ──────────────────────────────────────────────────────────────

/**
 * Returns true when a normalised point falls "on" the given markup.
 * tolerancePx is in screen pixels; we convert it to normalised units using zoom
 * and an assumed canvas width of 1000px (typical full-page width).
 */
export function hitTest(
  markup: Markup,
  normalPt: NormalizedPoint,
  tolerancePx: number,
  zoom: number
): boolean {
  // Convert pixel tolerance → normalised tolerance (assume ~1000px canvas)
  const tol = tolerancePx / (zoom * 1000);

  if (!markup.visible) return false;

  switch (markup.kind) {
    case "bounds": {
      const { x, y, width, height } = markup.bounds;
      return (
        normalPt.x >= x - tol &&
        normalPt.x <= x + width + tol &&
        normalPt.y >= y - tol &&
        normalPt.y <= y + height + tol
      );
    }

    case "point": {
      const dx = normalPt.x - markup.point.x;
      const dy = normalPt.y - markup.point.y;
      return Math.sqrt(dx * dx + dy * dy) <= tol * 4;
    }

    case "text": {
      const dx = normalPt.x - markup.point.x;
      const dy = normalPt.y - markup.point.y;
      // rough text bounding box
      return Math.abs(dx) <= 0.15 && Math.abs(dy) <= 0.05;
    }

    case "line": {
      return distPointToSegment(normalPt, markup.start, markup.end) <= tol;
    }

    case "path": {
      const pts = markup.points;
      if (pts.length === 0) return false;
      for (let i = 0; i < pts.length - 1; i++) {
        if (distPointToSegment(normalPt, pts[i], pts[i + 1]) <= tol) return true;
      }
      return false;
    }

    default:
      return false;
  }
}

function distPointToSegment(
  p: NormalizedPoint,
  a: NormalizedPoint,
  b: NormalizedPoint
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const cx = a.x + t * dx - p.x;
  const cy = a.y + t * dy - p.y;
  return Math.sqrt(cx * cx + cy * cy);
}

// ─── Lasso hit test ───────────────────────────────────────────────────────────

/** Returns true when a markup's representative point falls inside the lasso rect. */
export function lassoHitTest(markup: Markup, lasso: NormalizedBounds): boolean {
  const insideRect = (pt: NormalizedPoint) =>
    pt.x >= lasso.x &&
    pt.x <= lasso.x + lasso.width &&
    pt.y >= lasso.y &&
    pt.y <= lasso.y + lasso.height;

  switch (markup.kind) {
    case "bounds":
      return insideRect({ x: markup.bounds.x + markup.bounds.width / 2, y: markup.bounds.y + markup.bounds.height / 2 });
    case "point":
      return insideRect(markup.point);
    case "text":
      return insideRect(markup.point);
    case "line":
      return insideRect(markup.start) && insideRect(markup.end);
    case "path":
      return markup.points.some(insideRect);
    default:
      return false;
  }
}
