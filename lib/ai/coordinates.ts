import type { BoundingBox } from "./types";

// All coordinates in normalized 0..1 page space (same as Sprint 6 revisions)

export function rasterToNormalized(
  px: number,
  py: number,
  pageWidthPx: number,
  pageHeightPx: number
): { x: number; y: number } {
  return {
    x: px / pageWidthPx,
    y: py / pageHeightPx,
  };
}

export function normalizedToRaster(
  x: number,
  y: number,
  pageWidthPx: number,
  pageHeightPx: number
): { px: number; py: number } {
  return {
    px: x * pageWidthPx,
    py: y * pageHeightPx,
  };
}

export function tileLocalToPagePixel(
  tileRow: number,
  tileCol: number,
  tileSize: number,
  overlapPx: number,
  localX: number,
  localY: number
): { px: number; py: number } {
  const step = tileSize - overlapPx;
  return {
    px: tileCol * step + localX,
    py: tileRow * step + localY,
  };
}

export function iou(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);

  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const intersection = interW * interH;

  if (intersection === 0) return 0;

  const aArea = a.w * a.h;
  const bArea = b.w * b.h;
  const union = aArea + bArea - intersection;

  return union === 0 ? 0 : intersection / union;
}
