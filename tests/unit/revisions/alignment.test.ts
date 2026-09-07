import { describe, it, expect } from "vitest";
import {
  normalizeRotation,
  cropBoxMatrix,
  alignmentQualityScore,
  isLowConfidence,
} from "@/lib/revisions/alignment";
import { IDENTITY_MATRIX } from "@/lib/revisions/matrices";

describe("normalizeRotation", () => {
  it("0 stays 0", () => expect(normalizeRotation(0)).toBe(0));
  it("90 stays 90", () => expect(normalizeRotation(90)).toBe(90));
  it("180 stays 180", () => expect(normalizeRotation(180)).toBe(180));
  it("270 stays 270", () => expect(normalizeRotation(270)).toBe(270));
  it("360 wraps to 0", () => expect(normalizeRotation(360)).toBe(0));
  it("-90 wraps to 270", () => expect(normalizeRotation(-90)).toBe(270));
  it("44 rounds to 0", () => expect(normalizeRotation(44)).toBe(0));
  it("45 rounds to 90 (Math.round ties round up)", () => expect(normalizeRotation(45)).toBe(90));
  it("46 rounds to 90", () => expect(normalizeRotation(46)).toBe(90));
  it("200 rounds to 180", () => expect(normalizeRotation(200)).toBe(180));
});

describe("cropBoxMatrix", () => {
  const W = 1000;
  const H = 800;

  it("0° returns identity", () => {
    const M = cropBoxMatrix(W, H, 0);
    expect(M).toEqual(IDENTITY_MATRIX);
  });

  it("180° returns flip matrix (diagonal -1)", () => {
    const M = cropBoxMatrix(W, H, 180);
    expect(M[0]).toBeCloseTo(-1);
    expect(M[4]).toBeCloseTo(-1);
  });

  it("90° returns a non-identity rotation", () => {
    const M = cropBoxMatrix(W, H, 90);
    // Not identity
    expect(M).not.toEqual(IDENTITY_MATRIX);
    // Off-diagonal should be non-zero
    expect(Math.abs(M[1]) + Math.abs(M[3])).toBeGreaterThan(0.5);
  });

  it("270° returns a different non-identity rotation from 90°", () => {
    const M90 = cropBoxMatrix(W, H, 90);
    const M270 = cropBoxMatrix(W, H, 270);
    expect(M90).not.toEqual(M270);
  });
});

describe("alignmentQualityScore", () => {
  it("returns close to 1.0 for zero residual with many points", () => {
    const score = alignmentQualityScore(0, 6);
    expect(score).toBeCloseTo(1.0);
  });

  it("decreases with higher residual", () => {
    const s0 = alignmentQualityScore(0, 2);
    const s1 = alignmentQualityScore(0.05, 2);
    const s2 = alignmentQualityScore(0.2, 2);
    expect(s0).toBeGreaterThan(s1);
    expect(s1).toBeGreaterThan(s2);
  });

  it("increases with more points (bonus)", () => {
    const s2 = alignmentQualityScore(0, 2);
    const s5 = alignmentQualityScore(0, 5);
    expect(s5).toBeGreaterThanOrEqual(s2);
  });

  it("clamps between 0 and 1", () => {
    const score = alignmentQualityScore(999, 1);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("isLowConfidence", () => {
  it("returns true when score < 0.7", () => {
    expect(isLowConfidence(0.5)).toBe(true);
    expect(isLowConfidence(0.69)).toBe(true);
  });

  it("returns false when score >= 0.7", () => {
    expect(isLowConfidence(0.7)).toBe(false);
    expect(isLowConfidence(0.9)).toBe(false);
    expect(isLowConfidence(1.0)).toBe(false);
  });
});
