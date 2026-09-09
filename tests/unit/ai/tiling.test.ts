import { describe, it, expect } from "vitest";
import { computeTiles } from "@/lib/ai/tiling";

describe("computeTiles", () => {
  it("returns exactly 1 tile for a page smaller than tile size", () => {
    const tiles = computeTiles(512, 512, 1024, 64);
    expect(tiles.length).toBe(1);
    expect(tiles[0]).toMatchObject({ row: 0, col: 0, x: 0, y: 0, w: 512, h: 512 });
  });

  it("covers a 2048x1024 page with correct tile count", () => {
    // step = 1024 - 64 = 960
    // cols = ceil((2048 - 64) / 960) = ceil(1984 / 960) = ceil(2.066) = 3
    // rows = ceil((1024 - 64) / 960) = ceil(960 / 960) = 1
    const tiles = computeTiles(2048, 1024, 1024, 64);
    const cols = new Set(tiles.map((t) => t.col));
    const rows = new Set(tiles.map((t) => t.row));
    expect(rows.size).toBe(1);
    expect(cols.size).toBe(3);
    expect(tiles.length).toBe(3);
  });

  it("all tiles have positive width and height", () => {
    const tiles = computeTiles(3000, 2000, 1024, 64);
    for (const tile of tiles) {
      expect(tile.w).toBeGreaterThan(0);
      expect(tile.h).toBeGreaterThan(0);
    }
  });

  it("first tile always starts at (0, 0)", () => {
    const tiles = computeTiles(2000, 2000);
    expect(tiles[0].x).toBe(0);
    expect(tiles[0].y).toBe(0);
  });

  it("tiles cover the entire page width (overlap verified)", () => {
    const pageW = 2048;
    const pageH = 1024;
    const tileSizePx = 1024;
    const overlapPx = 64;
    const step = tileSizePx - overlapPx; // 960

    const tiles = computeTiles(pageW, pageH, tileSizePx, overlapPx);

    // Every pixel in the page should be covered by at least one tile
    // Check a few x positions
    for (const xPos of [0, 500, 1000, 1500, 2000, 2047]) {
      const covered = tiles.some((t) => t.x <= xPos && t.x + t.w > xPos);
      expect(covered, `x=${xPos} should be covered`).toBe(true);
    }

    expect(step).toBe(960); // sanity check
  });

  it("uses default tile size and overlap when not provided", () => {
    const tiles = computeTiles(2000, 1500);
    // should not throw and return valid tiles
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles[0].w).toBeLessThanOrEqual(1024);
    expect(tiles[0].h).toBeLessThanOrEqual(1024);
  });
});
