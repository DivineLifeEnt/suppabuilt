import { describe, it, expect } from "vitest";
import { MARKUP_LIMITS } from "@/lib/markup/types";
import { createMarkupSchema, markupStyleSchema } from "@/lib/markup/schemas";

const validPlanId = "00000000-0000-4000-a000-000000000001";

const baseInput = {
  planId: validPlanId,
  pageNumber: 1,
  style: {
    color: "#EF4444",
    strokeWidth: 2,
    opacity: 1,
    fontSize: 16,
  },
  status: "open" as const,
  locked: false,
  visible: true,
  zIndex: 0,
  authorName: "Test User",
  label: null,
  comment: null,
};

describe("createMarkupSchema — rectangle (bounds)", () => {
  it("accepts valid rectangle input", () => {
    const result = createMarkupSchema.safeParse({
      ...baseInput,
      tool: "rectangle",
      kind: "bounds",
      bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range bounds (x > 1)", () => {
    const result = createMarkupSchema.safeParse({
      ...baseInput,
      tool: "rectangle",
      kind: "bounds",
      bounds: { x: 1.5, y: 0.1, width: 0.5, height: 0.5 },
    });
    expect(result.success).toBe(false);
  });
});

describe("createMarkupSchema — text", () => {
  it("accepts valid text input", () => {
    const result = createMarkupSchema.safeParse({
      ...baseInput,
      tool: "text",
      kind: "text",
      point: { x: 0.3, y: 0.4 },
      text: "Hello world",
    });
    expect(result.success).toBe(true);
  });

  it("rejects text exceeding max length", () => {
    const result = createMarkupSchema.safeParse({
      ...baseInput,
      tool: "text",
      kind: "text",
      point: { x: 0.3, y: 0.4 },
      text: "x".repeat(MARKUP_LIMITS.maxTextLength + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("createMarkupSchema — pen path", () => {
  it("accepts valid path input", () => {
    const result = createMarkupSchema.safeParse({
      ...baseInput,
      tool: "pen",
      kind: "path",
      points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects path with too many points", () => {
    const points = Array.from({ length: MARKUP_LIMITS.maxPathPoints + 1 }, (_, i) => ({
      x: (i / (MARKUP_LIMITS.maxPathPoints + 1)),
      y: 0.5,
    }));
    const result = createMarkupSchema.safeParse({
      ...baseInput,
      tool: "pen",
      kind: "path",
      points,
    });
    expect(result.success).toBe(false);
  });
});

describe("markupStyleSchema — limits", () => {
  it("rejects opacity below minimum", () => {
    const r = markupStyleSchema.safeParse({
      color: "#F00",
      strokeWidth: 2,
      opacity: 0.01,
      fontSize: 16,
    });
    expect(r.success).toBe(false);
  });

  it("rejects fontSize below minimum", () => {
    const r = markupStyleSchema.safeParse({
      color: "#F00",
      strokeWidth: 2,
      opacity: 1,
      fontSize: 4,
    });
    expect(r.success).toBe(false);
  });

  it("rejects strokeWidth above maximum", () => {
    const r = markupStyleSchema.safeParse({
      color: "#F00",
      strokeWidth: 100,
      opacity: 1,
      fontSize: 16,
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid color format", () => {
    const r = markupStyleSchema.safeParse({
      color: "red",
      strokeWidth: 2,
      opacity: 1,
      fontSize: 16,
    });
    expect(r.success).toBe(false);
  });
});

describe("MARKUP_LIMITS", () => {
  it("has expected boundary values", () => {
    expect(MARKUP_LIMITS.maxBatch).toBe(250);
    expect(MARKUP_LIMITS.maxTextLength).toBe(5000);
    expect(MARKUP_LIMITS.maxPathPoints).toBe(5000);
    expect(MARKUP_LIMITS.minOpacity).toBe(0.05);
    expect(MARKUP_LIMITS.maxOpacity).toBe(1);
  });
});
