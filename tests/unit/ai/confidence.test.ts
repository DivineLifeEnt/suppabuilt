import { describe, it, expect } from "vitest";
import {
  isHighConfidence,
  isMediumConfidence,
  isLowConfidence,
  confidenceLabel,
} from "@/lib/ai/confidence";

describe("isHighConfidence", () => {
  it("returns true for score >= 0.85", () => {
    expect(isHighConfidence(0.85)).toBe(true);
    expect(isHighConfidence(1.0)).toBe(true);
    expect(isHighConfidence(0.9)).toBe(true);
  });

  it("returns false for score < 0.85", () => {
    expect(isHighConfidence(0.84)).toBe(false);
    expect(isHighConfidence(0.6)).toBe(false);
    expect(isHighConfidence(0.0)).toBe(false);
  });
});

describe("isMediumConfidence", () => {
  it("returns true for 0.60 <= score < 0.85", () => {
    expect(isMediumConfidence(0.60)).toBe(true);
    expect(isMediumConfidence(0.75)).toBe(true);
    expect(isMediumConfidence(0.849)).toBe(true);
  });

  it("returns false for score < 0.60", () => {
    expect(isMediumConfidence(0.59)).toBe(false);
    expect(isMediumConfidence(0.0)).toBe(false);
  });

  it("returns false for score >= 0.85", () => {
    expect(isMediumConfidence(0.85)).toBe(false);
    expect(isMediumConfidence(1.0)).toBe(false);
  });
});

describe("isLowConfidence", () => {
  it("returns true for score < 0.60", () => {
    expect(isLowConfidence(0.59)).toBe(true);
    expect(isLowConfidence(0.0)).toBe(true);
    expect(isLowConfidence(0.3)).toBe(true);
  });

  it("returns false for score >= 0.60", () => {
    expect(isLowConfidence(0.60)).toBe(false);
    expect(isLowConfidence(0.85)).toBe(false);
    expect(isLowConfidence(1.0)).toBe(false);
  });
});

describe("confidenceLabel", () => {
  it("returns 'high' for score >= 0.85", () => {
    expect(confidenceLabel(0.85)).toBe("high");
    expect(confidenceLabel(1.0)).toBe("high");
  });

  it("returns 'medium' for 0.60 <= score < 0.85", () => {
    expect(confidenceLabel(0.60)).toBe("medium");
    expect(confidenceLabel(0.78)).toBe("medium");
    expect(confidenceLabel(0.849)).toBe("medium");
  });

  it("returns 'low' for score < 0.60", () => {
    expect(confidenceLabel(0.0)).toBe("low");
    expect(confidenceLabel(0.59)).toBe("low");
  });

  // Boundary values
  it("handles boundary value at exactly 0.60", () => {
    expect(confidenceLabel(0.60)).toBe("medium");
  });

  it("handles boundary value at exactly 0.85", () => {
    expect(confidenceLabel(0.85)).toBe("high");
  });

  it("handles value just below 0.60", () => {
    expect(confidenceLabel(0.5999)).toBe("low");
  });

  it("handles value just below 0.85", () => {
    expect(confidenceLabel(0.8499)).toBe("medium");
  });
});
