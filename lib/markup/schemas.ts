import { z } from "zod";
import { MARKUP_LIMITS } from "./types";

// ─── Primitives ───────────────────────────────────────────────────────────────
export const normalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const normalizedBoundsSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const markupStyleSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
  strokeWidth: z
    .number()
    .min(MARKUP_LIMITS.minStrokeWidth)
    .max(MARKUP_LIMITS.maxStrokeWidth),
  opacity: z
    .number()
    .min(MARKUP_LIMITS.minOpacity)
    .max(MARKUP_LIMITS.maxOpacity),
  fontSize: z
    .number()
    .min(MARKUP_LIMITS.minFontSize)
    .max(MARKUP_LIMITS.maxFontSize),
});

export const markupStatusSchema = z.enum([
  "open",
  "pending",
  "resolved",
  "void",
]);

export const markupToolSchema = z.enum([
  "select",
  "pan",
  "text",
  "pen",
  "highlighter",
  "line",
  "arrow",
  "rectangle",
  "ellipse",
  "cloud",
  "checkmark",
  "cross",
  "pin",
  "eraser",
]);

// ─── Geometry schemas ─────────────────────────────────────────────────────────
const boundsGeometrySchema = z.object({
  kind: z.literal("bounds"),
  bounds: normalizedBoundsSchema,
});

const pathGeometrySchema = z.object({
  kind: z.literal("path"),
  points: z
    .array(normalizedPointSchema)
    .max(MARKUP_LIMITS.maxPathPoints),
});

const lineGeometrySchema = z.object({
  kind: z.literal("line"),
  start: normalizedPointSchema,
  end: normalizedPointSchema,
});

const pointGeometrySchema = z.object({
  kind: z.literal("point"),
  point: normalizedPointSchema,
});

const textGeometrySchema = z.object({
  kind: z.literal("text"),
  point: normalizedPointSchema,
  text: z.string().max(MARKUP_LIMITS.maxTextLength),
});

// ─── Base fields ──────────────────────────────────────────────────────────────
const markupBaseSchema = z.object({
  planId: z.string().uuid(),
  pageNumber: z.number().int().min(1),
  tool: markupToolSchema,
  style: markupStyleSchema,
  status: markupStatusSchema,
  locked: z.boolean(),
  visible: z.boolean(),
  zIndex: z.number().int(),
  authorName: z.string().max(200),
  label: z.string().max(500).nullable(),
  comment: z.string().max(5000).nullable(),
});

// ─── Full markup discriminated schema ─────────────────────────────────────────
export const createMarkupSchema = z.discriminatedUnion("kind", [
  markupBaseSchema.extend({
    tool: z.enum(["rectangle", "ellipse", "highlighter"]),
    ...boundsGeometrySchema.shape,
  }),
  markupBaseSchema.extend({
    tool: z.enum(["pen", "cloud"]),
    ...pathGeometrySchema.shape,
  }),
  markupBaseSchema.extend({
    tool: z.enum(["line", "arrow"]),
    ...lineGeometrySchema.shape,
  }),
  markupBaseSchema.extend({
    tool: z.enum(["pin", "checkmark", "cross"]),
    ...pointGeometrySchema.shape,
  }),
  markupBaseSchema.extend({
    tool: z.literal("text"),
    ...textGeometrySchema.shape,
  }),
]);

// ─── Update schema ────────────────────────────────────────────────────────────
export const updateMarkupSchema = z.object({
  expectedRevision: z.number().int().min(1),
  style: markupStyleSchema.partial().optional(),
  status: markupStatusSchema.optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  zIndex: z.number().int().optional(),
  label: z.string().max(500).nullable().optional(),
  comment: z.string().max(5000).nullable().optional(),
  authorName: z.string().max(200).optional(),
  // geometry updates
  bounds: normalizedBoundsSchema.optional(),
  points: z.array(normalizedPointSchema).max(MARKUP_LIMITS.maxPathPoints).optional(),
  start: normalizedPointSchema.optional(),
  end: normalizedPointSchema.optional(),
  point: normalizedPointSchema.optional(),
  text: z.string().max(MARKUP_LIMITS.maxTextLength).optional(),
});

// ─── Batch schema ─────────────────────────────────────────────────────────────
export const batchItemSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("create"), input: createMarkupSchema }),
  z.object({
    op: z.literal("update"),
    id: z.string(),
    input: updateMarkupSchema.omit({ expectedRevision: true }),
    expectedRevision: z.number().int().min(1),
  }),
  z.object({
    op: z.literal("delete"),
    id: z.string(),
    expectedRevision: z.number().int().min(1),
  }),
]);

export const batchSchema = z.object({
  items: z.array(batchItemSchema).max(MARKUP_LIMITS.maxBatch),
});

// ─── Query schema ─────────────────────────────────────────────────────────────
export const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).optional()),
});
