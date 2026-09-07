import { describe, it, expect } from "vitest";
import {
  IDENTITY_MATRIX,
  matMul,
  matInverse,
  transformPoint,
  transformBounds,
  twoPointSimilarity,
  threePointAffine,
  isValidMatrix,
  matrixResidualError,
  MatrixSingularError,
  type AffineMatrix,
} from "@/lib/revisions/matrices";

describe("IDENTITY_MATRIX", () => {
  it("is the 3x3 identity", () => {
    expect(IDENTITY_MATRIX).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
});

describe("matMul", () => {
  it("identity * identity = identity", () => {
    const result = matMul(IDENTITY_MATRIX, IDENTITY_MATRIX);
    expect(result).toEqual(IDENTITY_MATRIX);
  });

  it("translation matrix moves a point", () => {
    const tx = 0.2;
    const ty = 0.3;
    const T: AffineMatrix = [1, 0, tx, 0, 1, ty, 0, 0, 1];
    const [rx, ry] = transformPoint(T, 0.1, 0.1);
    expect(rx).toBeCloseTo(0.3);
    expect(ry).toBeCloseTo(0.4);
  });
});

describe("matInverse", () => {
  it("inverse of identity is identity", () => {
    const inv = matInverse(IDENTITY_MATRIX);
    expect(inv[0]).toBeCloseTo(1);
    expect(inv[4]).toBeCloseTo(1);
    expect(inv[8]).toBeCloseTo(1);
  });

  it("throws MatrixSingularError for a degenerate matrix", () => {
    const singular: AffineMatrix = [0, 0, 0, 0, 0, 0, 0, 0, 1];
    expect(() => matInverse(singular)).toThrow(MatrixSingularError);
  });

  it("A * inv(A) ≈ identity", () => {
    const M: AffineMatrix = [2, 0, 0.5, 0, 2, 0.5, 0, 0, 1];
    const inv = matInverse(M);
    const product = matMul(M, inv);
    expect(product[0]).toBeCloseTo(1);
    expect(product[4]).toBeCloseTo(1);
    expect(product[1]).toBeCloseTo(0);
    expect(product[3]).toBeCloseTo(0);
  });
});

describe("transformPoint", () => {
  it("identity leaves point unchanged", () => {
    const [rx, ry] = transformPoint(IDENTITY_MATRIX, 0.4, 0.6);
    expect(rx).toBeCloseTo(0.4);
    expect(ry).toBeCloseTo(0.6);
  });

  it("applies scale correctly", () => {
    const scale2: AffineMatrix = [2, 0, 0, 0, 2, 0, 0, 0, 1];
    const [rx, ry] = transformPoint(scale2, 0.25, 0.25);
    expect(rx).toBeCloseTo(0.5);
    expect(ry).toBeCloseTo(0.5);
  });
});

describe("transformBounds", () => {
  it("identity leaves bounds unchanged", () => {
    const bounds = { x: 0.1, y: 0.1, width: 0.3, height: 0.2 };
    const result = transformBounds(IDENTITY_MATRIX, bounds);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.1);
    expect(result.width).toBeCloseTo(0.3);
    expect(result.height).toBeCloseTo(0.2);
  });

  it("scale doubles width and height", () => {
    const scale2: AffineMatrix = [2, 0, 0, 0, 2, 0, 0, 0, 1];
    const bounds = { x: 0, y: 0, width: 0.2, height: 0.1 };
    const result = transformBounds(scale2, bounds);
    expect(result.width).toBeCloseTo(0.4);
    expect(result.height).toBeCloseTo(0.2);
  });
});

describe("twoPointSimilarity", () => {
  it("identity when base and comp points are the same", () => {
    const base: [{ x: number; y: number }, { x: number; y: number }] = [
      { x: 0.2, y: 0.3 },
      { x: 0.6, y: 0.7 },
    ];
    const comp: [{ x: number; y: number }, { x: number; y: number }] = [
      { x: 0.2, y: 0.3 },
      { x: 0.6, y: 0.7 },
    ];
    const M = twoPointSimilarity(base, comp);
    const [rx, ry] = transformPoint(M, 0.4, 0.5);
    expect(rx).toBeCloseTo(0.4);
    expect(ry).toBeCloseTo(0.5);
  });

  it("maps comparison points to base points", () => {
    const base: [{ x: number; y: number }, { x: number; y: number }] = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.1 },
    ];
    const comp: [{ x: number; y: number }, { x: number; y: number }] = [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
    ];
    const M = twoPointSimilarity(base, comp);
    const [r0x, r0y] = transformPoint(M, comp[0].x, comp[0].y);
    expect(r0x).toBeCloseTo(base[0].x, 5);
    expect(r0y).toBeCloseTo(base[0].y, 5);
    const [r1x, r1y] = transformPoint(M, comp[1].x, comp[1].y);
    expect(r1x).toBeCloseTo(base[1].x, 5);
    expect(r1y).toBeCloseTo(base[1].y, 5);
  });
});

describe("threePointAffine", () => {
  it("maps three comparison points to three base points", () => {
    const base: [
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
    ] = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.1 },
      { x: 0.3, y: 0.5 },
    ];
    const comp: [
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
    ] = [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.4, y: 0.6 },
    ];
    const M = threePointAffine(base, comp);
    for (let i = 0; i < 3; i++) {
      const [rx, ry] = transformPoint(M, comp[i].x, comp[i].y);
      expect(rx).toBeCloseTo(base[i].x, 5);
      expect(ry).toBeCloseTo(base[i].y, 5);
    }
  });
});

describe("isValidMatrix", () => {
  it("returns true for identity", () => {
    expect(isValidMatrix(IDENTITY_MATRIX)).toBe(true);
  });

  it("returns false for singular matrix", () => {
    const singular: AffineMatrix = [0, 0, 0, 0, 0, 0, 0, 0, 1];
    expect(isValidMatrix(singular)).toBe(false);
  });
});

describe("matrixResidualError", () => {
  it("returns 0 for perfect mapping (identity on matching points)", () => {
    const base = [{ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 }];
    const comp = [{ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 }];
    // With identity matrix, comp maps to itself which equals base
    const err = matrixResidualError(IDENTITY_MATRIX, base, comp);
    expect(err).toBeCloseTo(0, 5);
  });
});
