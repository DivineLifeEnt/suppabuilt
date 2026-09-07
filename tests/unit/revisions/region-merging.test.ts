import { describe, it, expect } from "vitest";
import { mergeOverlappingRegions } from "@/lib/revisions/region-merging";
import type { ChangeRegion } from "@/lib/revisions/types";

function makeRegion(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  strength = 0.5
): ChangeRegion {
  return {
    id,
    comparisonId: "cmp-1",
    bounds: { x, y, width: w, height: h },
    kind: "changed",
    changedPixelCount: 100,
    strength,
    reviewStatus: "unreviewed",
    revision: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("mergeOverlappingRegions", () => {
  it("returns empty array for empty input", () => {
    expect(mergeOverlappingRegions([])).toEqual([]);
  });

  it("keeps non-overlapping regions separate", () => {
    const r1 = makeRegion("r1", 0, 0, 0.1, 0.1);
    const r2 = makeRegion("r2", 0.9, 0.9, 0.1, 0.1);
    const result = mergeOverlappingRegions([r1, r2]);
    expect(result).toHaveLength(2);
  });

  it("merges two identical overlapping regions into one", () => {
    const r1 = makeRegion("r1", 0.1, 0.1, 0.4, 0.4);
    const r2 = makeRegion("r2", 0.1, 0.1, 0.4, 0.4);
    const result = mergeOverlappingRegions([r1, r2]);
    expect(result).toHaveLength(1);
    expect(result[0].bounds.x).toBeCloseTo(0.1);
    expect(result[0].bounds.y).toBeCloseTo(0.1);
    expect(result[0].bounds.width).toBeCloseTo(0.4);
    expect(result[0].bounds.height).toBeCloseTo(0.4);
  });

  it("sums changedPixelCount when merging", () => {
    const r1 = makeRegion("r1", 0.1, 0.1, 0.4, 0.4);
    const r2 = makeRegion("r2", 0.15, 0.15, 0.35, 0.35);
    const result = mergeOverlappingRegions([r1, r2]);
    expect(result).toHaveLength(1);
    expect(result[0].changedPixelCount).toBe(200);
  });

  it("computes weighted mean strength when merging", () => {
    const r1 = makeRegion("r1", 0.1, 0.1, 0.4, 0.4, 0.4);
    const r2 = makeRegion("r2", 0.15, 0.15, 0.35, 0.35, 0.6);
    const result = mergeOverlappingRegions([r1, r2]);
    expect(result).toHaveLength(1);
    // Equal pixel counts: (0.4 + 0.6) / 2 = 0.5
    expect(result[0].strength).toBeCloseTo(0.5, 5);
  });

  it("does not merge regions with IoU below 0.3", () => {
    // r1: [0, 0, 0.3, 0.3]; r2: [0.25, 0.25, 0.3, 0.3]
    // intersection: 0.05 x 0.05 = 0.0025
    // union: 0.09 + 0.09 - 0.0025 = 0.1775
    // IoU ≈ 0.014 < 0.3 → no merge
    const r1 = makeRegion("r1", 0, 0, 0.3, 0.3);
    const r2 = makeRegion("r2", 0.25, 0.25, 0.3, 0.3);
    const result = mergeOverlappingRegions([r1, r2]);
    expect(result).toHaveLength(2);
  });
});
