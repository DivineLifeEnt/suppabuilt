import { describe, it, expect } from "vitest";
import {
  rasterToNormalized,
  normalizedToRaster,
  tileLocalToPagePixel,
  iou,
} from "@/lib/ai/coordinates";

describe("rasterToNormalized", () => {
  it("converts center pixel to normalized 0.5, 0.5", () => {
    const result = rasterToNormalized(500, 400, 1000, 800);
    expect(result.x).toBeCloseTo(0.5);
    expect(result.y).toBeCloseTo(0.5);
  });

  it("converts top-left pixel to 0, 0", () => {
    const result = rasterToNormalized(0, 0, 1000, 800);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("converts bottom-right pixel to 1, 1", () => {
    const result = rasterToNormalized(1000, 800, 1000, 800);
    expect(result.x).toBe(1);
    expect(result.y).toBe(1);
  });
});

describe("normalizedToRaster", () => {
  it("converts 0.5, 0.5 to center pixel", () => {
    const result = normalizedToRaster(0.5, 0.5, 1000, 800);
    expect(result.px).toBeCloseTo(500);
    expect(result.py).toBeCloseTo(400);
  });

  it("converts 0, 0 to 0, 0", () => {
    const result = normalizedToRaster(0, 0, 1000, 800);
    expect(result.px).toBe(0);
    expect(result.py).toBe(0);
  });
});

describe("round-trip rasterToNormalized / normalizedToRaster", () => {
  it("is lossless for arbitrary pixel coordinates", () => {
    const px = 347;
    const py = 212;
    const w = 1200;
    const h = 900;

    const norm = rasterToNormalized(px, py, w, h);
    const back = normalizedToRaster(norm.x, norm.y, w, h);

    expect(back.px).toBeCloseTo(px, 5);
    expect(back.py).toBeCloseTo(py, 5);
  });
});

describe("tileLocalToPagePixel", () => {
  it("tile (0,0) local (0,0) maps to page (0,0)", () => {
    const result = tileLocalToPagePixel(0, 0, 1024, 64, 0, 0);
    expect(result.px).toBe(0);
    expect(result.py).toBe(0);
  });

  it("tile (1,2) maps with correct step offset", () => {
    const step = 1024 - 64; // = 960
    const result = tileLocalToPagePixel(1, 2, 1024, 64, 100, 50);
    expect(result.px).toBe(2 * step + 100);
    expect(result.py).toBe(1 * step + 50);
  });
});

describe("iou", () => {
  it("returns 1 for identical boxes", () => {
    const box = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
    expect(iou(box, box)).toBeCloseTo(1);
  });

  it("returns 0 for non-overlapping boxes", () => {
    const a = { x: 0.0, y: 0.0, w: 0.1, h: 0.1 };
    const b = { x: 0.5, y: 0.5, w: 0.1, h: 0.1 };
    expect(iou(a, b)).toBe(0);
  });

  it("returns correct value for partial overlap", () => {
    // a: [0, 0] -> [0.2, 0.2], area = 0.04
    // b: [0.1, 0.1] -> [0.3, 0.3], area = 0.04
    // intersection: [0.1, 0.1] -> [0.2, 0.2] = 0.01
    // union = 0.04 + 0.04 - 0.01 = 0.07
    const a = { x: 0, y: 0, w: 0.2, h: 0.2 };
    const b = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
    const result = iou(a, b);
    expect(result).toBeCloseTo(0.01 / 0.07, 5);
  });

  it("returns 0 for adjacent boxes (touching but no overlap)", () => {
    const a = { x: 0.0, y: 0.0, w: 0.1, h: 0.1 };
    const b = { x: 0.1, y: 0.0, w: 0.1, h: 0.1 };
    expect(iou(a, b)).toBe(0);
  });
});
