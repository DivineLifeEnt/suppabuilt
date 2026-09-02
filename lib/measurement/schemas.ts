import { z } from "zod";

// ─── Primitives ───────────────────────────────────────────────────────────────
export const NormalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const NormalizedBoundsSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const MeasurementStyleSchema = z.object({
  stroke: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
  strokeWidth: z.number().min(0.5).max(24),
  fill: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).nullable(),
  opacity: z.number().min(0).max(1),
  fontSize: z.number().min(6).max(144),
  labelPosition: z.enum(["auto", "center", "start", "end"]),
});

export const MeasurementStatusSchema = z.enum(["open", "resolved"]);

const LinearUnitSchema = z.enum([
  "millimeter",
  "centimeter",
  "meter",
  "inch",
  "foot",
]);

const AreaUnitSchema = z.enum([
  "square-millimeter",
  "square-centimeter",
  "square-meter",
  "square-inch",
  "square-foot",
]);

const VolumeUnitSchema = z.enum([
  "cubic-millimeter",
  "cubic-centimeter",
  "cubic-meter",
  "cubic-inch",
  "cubic-foot",
]);

const UnitSystemSchema = z.enum([
  "imperial-architectural",
  "imperial-decimal",
  "metric",
]);

const ArchitecturalDenominatorSchema = z.union([
  z.literal(2),
  z.literal(4),
  z.literal(8),
  z.literal(16),
  z.literal(32),
  z.literal(64),
]);

// ─── Calibration ─────────────────────────────────────────────────────────────
export const CreateCalibrationSchema = z.object({
  planId: z.string().min(1).max(200),
  pageNumber: z.number().int().min(1).nullable(),
  name: z.string().min(1).max(200),
  normalizedStart: NormalizedPointSchema,
  normalizedEnd: NormalizedPointSchema,
  knownDistanceMillimeters: z.number().positive().finite(),
  unitSystem: UnitSystemSchema,
  displayUnit: LinearUnitSchema,
  precision: z.number().int().min(0).max(6),
  architecturalDenominator: ArchitecturalDenominatorSchema.optional(),
});

export const UpdateCalibrationSchema = CreateCalibrationSchema.partial().extend({
  expectedRevision: z.number().int().min(1),
});

// ─── Measurement base fields ──────────────────────────────────────────────────
const MeasurementBaseSchema = z.object({
  planId: z.string().min(1).max(200),
  pageNumber: z.number().int().min(1),
  calibrationId: z.string().nullable(),
  label: z.string().max(500).nullable(),
  prefix: z.string().max(100).nullable(),
  suffix: z.string().max(100).nullable(),
  style: MeasurementStyleSchema,
  locked: z.boolean(),
  visible: z.boolean(),
  status: MeasurementStatusSchema,
  groupId: z.string().nullable(),
  zIndex: z.number().int(),
});

// ─── Per-type measurement schemas ─────────────────────────────────────────────
const LinearSchema = MeasurementBaseSchema.extend({
  type: z.literal("linear"),
  start: NormalizedPointSchema,
  end: NormalizedPointSchema,
  displayUnit: LinearUnitSchema,
  precision: z.number().int().min(0).max(6),
});

const PolylineSchema = MeasurementBaseSchema.extend({
  type: z.enum(["polyline", "perimeter"]),
  points: z.array(NormalizedPointSchema).min(2).max(5000),
  closed: z.boolean(),
  displayUnit: LinearUnitSchema,
  precision: z.number().int().min(0).max(6),
});

const PolygonGeometrySchema = z.object({
  kind: z.literal("polygon"),
  points: z.array(NormalizedPointSchema).min(3).max(5000),
});

const BoundsGeometrySchema = z.object({
  kind: z.literal("bounds"),
  bounds: NormalizedBoundsSchema,
  rotation: z.number(),
});

const AreaGeometrySchema = z.discriminatedUnion("kind", [
  PolygonGeometrySchema,
  BoundsGeometrySchema,
]);

const AreaSchema = MeasurementBaseSchema.extend({
  type: z.enum(["polygon-area", "rectangle-area"]),
  geometry: AreaGeometrySchema,
  displayUnit: AreaUnitSchema,
  precision: z.number().int().min(0).max(6),
});

const VolumeSchema = MeasurementBaseSchema.extend({
  type: z.literal("volume"),
  geometry: AreaGeometrySchema,
  depthMillimeters: z.number().positive().finite(),
  displayUnit: VolumeUnitSchema,
  precision: z.number().int().min(0).max(6),
});

const CircularSchema = MeasurementBaseSchema.extend({
  type: z.enum(["diameter", "radius"]),
  center: NormalizedPointSchema,
  edge: NormalizedPointSchema,
  displayUnit: LinearUnitSchema,
  precision: z.number().int().min(0).max(6),
});

const AngleSchema = MeasurementBaseSchema.extend({
  type: z.literal("angle"),
  vertex: NormalizedPointSchema,
  start: NormalizedPointSchema,
  end: NormalizedPointSchema,
  precision: z.number().int().min(0).max(6),
});

const CountSchema = MeasurementBaseSchema.extend({
  type: z.literal("count"),
  points: z.array(NormalizedPointSchema).max(10000),
});

export const CreateMeasurementSchema = z.discriminatedUnion("type", [
  LinearSchema,
  PolylineSchema,
  AreaSchema,
  VolumeSchema,
  CircularSchema,
  AngleSchema,
  CountSchema,
]);

// ─── Update schema ────────────────────────────────────────────────────────────
export const UpdateMeasurementSchema = z.object({
  expectedRevision: z.number().int().min(1),
  label: z.string().max(500).nullable().optional(),
  prefix: z.string().max(100).nullable().optional(),
  suffix: z.string().max(100).nullable().optional(),
  style: MeasurementStyleSchema.partial().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  status: MeasurementStatusSchema.optional(),
  groupId: z.string().nullable().optional(),
  zIndex: z.number().int().optional(),
  // geometry patches
  start: NormalizedPointSchema.optional(),
  end: NormalizedPointSchema.optional(),
  points: z.array(NormalizedPointSchema).max(5000).optional(),
  center: NormalizedPointSchema.optional(),
  edge: NormalizedPointSchema.optional(),
  vertex: NormalizedPointSchema.optional(),
  geometry: AreaGeometrySchema.optional(),
  depthMillimeters: z.number().positive().finite().optional(),
  displayUnit: z.union([LinearUnitSchema, AreaUnitSchema, VolumeUnitSchema]).optional(),
  precision: z.number().int().min(0).max(6).optional(),
});

// ─── Batch schema ─────────────────────────────────────────────────────────────
const BatchItemSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("create"), input: CreateMeasurementSchema }),
  z.object({
    op: z.literal("update"),
    id: z.string(),
    input: UpdateMeasurementSchema.omit({ expectedRevision: true }),
    expectedRevision: z.number().int().min(1),
  }),
  z.object({
    op: z.literal("delete"),
    id: z.string(),
    expectedRevision: z.number().int().min(1),
  }),
]);

export const BatchMeasurementSchema = z.object({
  items: z.array(BatchItemSchema).max(250),
});

// ─── Group schemas ────────────────────────────────────────────────────────────
export const CreateGroupSchema = z.object({
  planId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
});

// ─── Query schema ─────────────────────────────────────────────────────────────
export const MeasurementListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).optional()),
  type: z.string().optional(),
  groupId: z.string().optional(),
});
