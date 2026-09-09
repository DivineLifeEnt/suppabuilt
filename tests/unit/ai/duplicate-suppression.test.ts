import { describe, it, expect } from "vitest";
import { suppressDuplicates } from "@/lib/ai/duplicate-suppression";
import type { SymbolDetection } from "@/lib/ai/types";

const makeDetection = (
  symbolType: string,
  x: number,
  y: number,
  confidence: number,
  count = 1
): SymbolDetection => ({
  symbolType,
  box: { x, y, w: 0.1, h: 0.1 },
  confidence,
  count,
});

describe("suppressDuplicates", () => {
  it("returns empty array for empty input", () => {
    expect(suppressDuplicates([])).toEqual([]);
  });

  it("keeps a single detection", () => {
    const detections = [makeDetection("diffuser", 0.1, 0.1, 0.9)];
    const result = suppressDuplicates(detections);
    expect(result.length).toBe(1);
  });

  it("removes lower-confidence overlapping detections of same type", () => {
    // Both boxes at same position (IoU = 1.0 > 0.3 threshold)
    const high = makeDetection("diffuser", 0.1, 0.1, 0.95);
    const low = makeDetection("diffuser", 0.1, 0.1, 0.70);
    const result = suppressDuplicates([low, high]); // high will be first after sorting
    expect(result.length).toBe(1);
    expect(result[0].confidence).toBe(0.95);
  });

  it("keeps non-overlapping detections of same type", () => {
    // Boxes far apart — IoU = 0
    const a = makeDetection("diffuser", 0.0, 0.0, 0.9);
    const b = makeDetection("diffuser", 0.5, 0.5, 0.8);
    const result = suppressDuplicates([a, b]);
    expect(result.length).toBe(2);
  });

  it("keeps overlapping detections of DIFFERENT types", () => {
    // Same position but different symbol type — should NOT suppress
    const diffuser = makeDetection("diffuser", 0.1, 0.1, 0.9);
    const grille = makeDetection("grille", 0.1, 0.1, 0.85);
    const result = suppressDuplicates([diffuser, grille]);
    expect(result.length).toBe(2);
  });

  it("preserves highest confidence detection when multiple overlap", () => {
    const low = makeDetection("diffuser", 0.1, 0.1, 0.5);
    const mid = makeDetection("diffuser", 0.1, 0.1, 0.7);
    const high = makeDetection("diffuser", 0.1, 0.1, 0.95);
    const result = suppressDuplicates([low, mid, high]);
    expect(result.length).toBe(1);
    expect(result[0].confidence).toBe(0.95);
  });

  it("does not mutate the original array", () => {
    const detections = [
      makeDetection("diffuser", 0.1, 0.1, 0.9),
      makeDetection("diffuser", 0.1, 0.1, 0.7),
    ];
    const original = [...detections];
    suppressDuplicates(detections);
    expect(detections).toEqual(original);
  });
});
