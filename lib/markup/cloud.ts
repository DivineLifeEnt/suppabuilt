import type { NormalizedBounds } from "./types";

/**
 * Generate an SVG path string for a cloud shape that fits inside the given
 * screen-space bounds (in pixels, already converted from normalised coords).
 */
export function cloudPath(
  x: number,
  y: number,
  width: number,
  height: number
): string {
  if (width <= 0 || height <= 0) return "";

  // Number of bumps along each axis
  const bumpRadius = Math.min(width, height) / 8;
  const bumpsX = Math.max(3, Math.round(width / (bumpRadius * 2.2)));
  const bumpsY = Math.max(2, Math.round(height / (bumpRadius * 2.2)));

  const bumpW = width / bumpsX;
  const bumpH = height / bumpsY;
  const rx = bumpW / 2;
  const ry = bumpH / 2;

  const parts: string[] = [];

  // Start at top-left first bump centre
  parts.push(`M ${x + rx} ${y}`);

  // Top edge — left to right
  for (let i = 0; i < bumpsX; i++) {
    const cx = x + i * bumpW + rx;
    parts.push(`A ${rx} ${ry} 0 0 1 ${cx + bumpW} ${y}`);
  }

  // Right edge — top to bottom
  for (let j = 0; j < bumpsY; j++) {
    const cy = y + j * bumpH + ry;
    parts.push(`A ${rx} ${ry} 0 0 1 ${x + width} ${cy + bumpH}`);
  }

  // Bottom edge — right to left
  for (let i = bumpsX - 1; i >= 0; i--) {
    const cx = x + i * bumpW + rx;
    parts.push(`A ${rx} ${ry} 0 0 1 ${cx - bumpW} ${y + height}`);
  }

  // Left edge — bottom to top
  for (let j = bumpsY - 1; j >= 0; j--) {
    const cy = y + j * bumpH + ry;
    parts.push(`A ${rx} ${ry} 0 0 1 ${x} ${cy - bumpH}`);
  }

  parts.push("Z");
  return parts.join(" ");
}

/**
 * Generate a cloud path from normalised bounds, given the canvas display size.
 */
export function cloudPathFromNorm(
  bounds: NormalizedBounds,
  canvasWidth: number,
  canvasHeight: number
): string {
  return cloudPath(
    bounds.x * canvasWidth,
    bounds.y * canvasHeight,
    bounds.width * canvasWidth,
    bounds.height * canvasHeight
  );
}
