// Tile a page image for AI processing

export interface Tile {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
} // pixel coords

export function computeTiles(
  pageWidthPx: number,
  pageHeightPx: number,
  tileSizePx = 1024,
  overlapPx = 64
): Tile[] {
  const tiles: Tile[] = [];
  const step = tileSizePx - overlapPx;

  const cols = Math.ceil((pageWidthPx - overlapPx) / step);
  const rows = Math.ceil((pageHeightPx - overlapPx) / step);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * step;
      const y = row * step;
      const w = Math.min(tileSizePx, pageWidthPx - x);
      const h = Math.min(tileSizePx, pageHeightPx - y);

      if (w > 0 && h > 0) {
        tiles.push({ row, col, x, y, w, h });
      }
    }
  }

  return tiles;
}
