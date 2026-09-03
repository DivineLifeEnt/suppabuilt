import { z } from "zod";

// ─── Primitives ───────────────────────────────────────────────────────────────
const NormalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const QuantityUnitSchema = z.enum([
  "each",
  "linear-foot",
  "linear-inch",
  "linear-meter",
  "square-foot",
  "square-meter",
  "cubic-foot",
  "cubic-meter",
  "pound",
  "kilogram",
  "gallon",
  "liter",
  "hour",
]);

export const HvacCategorySchema = z.enum([
  "equipment",
  "air-devices",
  "ductwork",
  "duct-fittings",
  "dampers",
  "controls",
  "refrigerant-piping",
  "hydronic-piping",
  "condensate-drains",
  "insulation",
  "supports-hangers",
  "accessories",
  "other",
]);

const DecimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "Must be a decimal number string");

const ColorSchema = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "Must be a hex color");

// ─── Assembly Rule ─────────────────────────────────────────────────────────────
const FixedRuleSchema = z.object({
  kind: z.literal("fixed"),
  quantity: DecimalStringSchema,
});

const MultiplyByCountRuleSchema = z.object({
  kind: z.literal("multiply-by-source-count"),
  factor: DecimalStringSchema,
});

const MultiplyLengthRuleSchema = z.object({
  kind: z.literal("multiply-length-by-factor"),
  factor: DecimalStringSchema,
});

const MultiplyAreaRuleSchema = z.object({
  kind: z.literal("multiply-area-by-factor"),
  factor: DecimalStringSchema,
});

const CeilingSpacingRuleSchema = z.object({
  kind: z.literal("ceiling-length-divided-by-spacing"),
  spacingFeet: DecimalStringSchema,
});

const ConditionalRuleSchema = z.object({
  kind: z.literal("conditional"),
  field: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, "field must be alphanumeric"),
  equals: z.string().max(200),
  thenQuantity: DecimalStringSchema,
  elseQuantity: DecimalStringSchema,
});

export const AssemblyRuleSchema = z.discriminatedUnion("kind", [
  FixedRuleSchema,
  MultiplyByCountRuleSchema,
  MultiplyLengthRuleSchema,
  MultiplyAreaRuleSchema,
  CeilingSpacingRuleSchema,
  ConditionalRuleSchema,
]);

// ─── TakeoffSource ─────────────────────────────────────────────────────────────
const ManualSourceSchema = z.object({ kind: z.literal("manual") });
const CountMarkerSourceSchema = z.object({
  kind: z.literal("count-marker"),
  markupId: z.string().min(1),
  point: NormalizedPointSchema,
});
const MeasurementSourceSchema = z.object({
  kind: z.literal("measurement"),
  measurementId: z.string().min(1),
});
const AssemblySourceSchema = z.object({
  kind: z.literal("assembly"),
  assemblyApplicationId: z.string().min(1),
  parentTakeoffItemId: z.string().min(1),
});

export const TakeoffSourceSchema = z.discriminatedUnion("kind", [
  ManualSourceSchema,
  CountMarkerSourceSchema,
  MeasurementSourceSchema,
  AssemblySourceSchema,
]);

// ─── TakeoffSize ──────────────────────────────────────────────────────────────
export const TakeoffSizeSchema = z.object({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  diameter: z.number().positive().optional(),
  unit: z.enum(["inch", "mm"]),
});

// ─── Catalog Item ─────────────────────────────────────────────────────────────
export const CreateCatalogItemSchema = z.object({
  organizationId: z.string().min(1).max(200),
  category: HvacCategorySchema,
  name: z.string().min(1).max(200),
  abbreviation: z.string().min(1).max(20),
  description: z.string().max(1000).nullable(),
  active: z.boolean().default(true),
  defaultUnit: QuantityUnitSchema,
  defaultColor: ColorSchema.default("#ff6a1a"),
  defaultSymbol: z.string().max(10).nullable().default(null),
  keywords: z.array(z.string().max(100)).max(50).default([]),
  sortOrder: z.number().int().default(0),
  createdBy: z.object({ name: z.string().min(1).max(200) }),
});

export const UpdateCatalogItemSchema = z.object({
  expectedRevision: z.number().int().min(1),
  category: HvacCategorySchema.optional(),
  name: z.string().min(1).max(200).optional(),
  abbreviation: z.string().min(1).max(20).optional(),
  description: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
  defaultUnit: QuantityUnitSchema.optional(),
  defaultColor: ColorSchema.optional(),
  defaultSymbol: z.string().max(10).nullable().optional(),
  keywords: z.array(z.string().max(100)).max(50).optional(),
  sortOrder: z.number().int().optional(),
});

// ─── Assembly Component ────────────────────────────────────────────────────────
const AssemblyComponentInputSchema = z.object({
  catalogItemId: z.string().min(1),
  unit: QuantityUnitSchema,
  rule: AssemblyRuleSchema,
  wastePercent: DecimalStringSchema.default("0"),
  sortOrder: z.number().int().default(0),
});

// ─── Assembly ─────────────────────────────────────────────────────────────────
export const CreateAssemblySchema = z.object({
  organizationId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  active: z.boolean().default(true),
  triggerCatalogItemId: z.string().min(1),
  components: z.array(AssemblyComponentInputSchema).min(1).max(100),
  createdBy: z.object({ name: z.string().min(1).max(200) }),
});

export const UpdateAssemblySchema = z.object({
  expectedRevision: z.number().int().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
  triggerCatalogItemId: z.string().min(1).optional(),
  components: z.array(AssemblyComponentInputSchema).min(1).max(100).optional(),
});

// ─── Assembly Preview / Apply ──────────────────────────────────────────────────
export const AssemblyPreviewSchema = z.object({
  sourceCount: z.number().int().min(1).optional(),
  sourceLengthMm: z.number().positive().optional(),
  sourceAreaMm2: z.number().positive().optional(),
  itemFields: z.record(z.string(), z.string()).optional(),
});

export const ApplyAssemblySchema = z.object({
  planId: z.string().min(1).max(200),
  pageNumber: z.number().int().min(1).optional(),
  sourceCount: z.number().int().min(1).optional(),
  sourceLengthMm: z.number().positive().optional(),
  sourceAreaMm2: z.number().positive().optional(),
  itemFields: z.record(z.string(), z.string()).optional(),
  appliedBy: z.string().min(1).max(200),
});

// ─── Takeoff Item ─────────────────────────────────────────────────────────────
export const CreateTakeoffItemSchema = z.object({
  planId: z.string().min(1).max(200),
  pageNumber: z.number().int().min(1).nullable().optional(),
  catalogItemId: z.string().min(1),
  source: TakeoffSourceSchema,
  unit: QuantityUnitSchema,
  netQuantity: DecimalStringSchema,
  wastePercent: DecimalStringSchema.default("0"),
  equipmentTag: z.string().max(100).nullable().optional(),
  size: TakeoffSizeSchema.nullable().optional(),
  material: z.string().max(200).nullable().optional(),
  systemId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  levelId: z.string().nullable().optional(),
  phaseId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["open", "resolved"]).default("open"),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  createdBy: z.object({ name: z.string().min(1).max(200) }),
});

export const UpdateTakeoffItemSchema = z.object({
  expectedRevision: z.number().int().min(1),
  netQuantity: DecimalStringSchema.optional(),
  wastePercent: DecimalStringSchema.optional(),
  unit: QuantityUnitSchema.optional(),
  equipmentTag: z.string().max(100).nullable().optional(),
  size: TakeoffSizeSchema.nullable().optional(),
  material: z.string().max(200).nullable().optional(),
  systemId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  levelId: z.string().nullable().optional(),
  phaseId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["open", "resolved"]).optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  source: TakeoffSourceSchema.optional(),
  pageNumber: z.number().int().min(1).nullable().optional(),
});

const BatchTakeoffItemSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("create"), input: CreateTakeoffItemSchema }),
  z.object({
    op: z.literal("update"),
    id: z.string().min(1),
    input: UpdateTakeoffItemSchema.omit({ expectedRevision: true }),
    expectedRevision: z.number().int().min(1),
  }),
  z.object({
    op: z.literal("delete"),
    id: z.string().min(1),
    expectedRevision: z.number().int().min(1),
  }),
]);

export const BatchTakeoffSchema = z.object({
  items: z.array(BatchTakeoffItemSchema).max(250),
});

// ─── Bulk edit ────────────────────────────────────────────────────────────────
export const BulkEditTakeoffSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(250),
  wastePercent: DecimalStringSchema.optional(),
  systemId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  levelId: z.string().nullable().optional(),
  phaseId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  status: z.enum(["open", "resolved"]).optional(),
});

// ─── Classification schemas ───────────────────────────────────────────────────
export const CreateSystemSchema = z.object({
  planId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  color: ColorSchema.default("#3B82F6"),
});

export const UpdateSystemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  color: ColorSchema.optional(),
});

export const CreateZoneSchema = z.object({
  planId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
});

export const UpdateZoneSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const CreateLevelSchema = z.object({
  planId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  elevation: z.number().nullable().optional(),
});

export const UpdateLevelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  elevation: z.number().nullable().optional(),
});

export const CreatePhaseSchema = z.object({
  planId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  sortOrder: z.number().int().default(0),
});

export const UpdatePhaseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sortOrder: z.number().int().optional(),
});

export const CreateGroupSchema = z.object({
  planId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  color: ColorSchema.default("#F59E0B"),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  color: ColorSchema.optional(),
});

// ─── List query ────────────────────────────────────────────────────────────────
export const TakeoffListQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined).pipe(z.number().int().min(1).optional()),
  category: HvacCategorySchema.optional(),
  systemId: z.string().optional(),
  zoneId: z.string().optional(),
  levelId: z.string().optional(),
  phaseId: z.string().optional(),
  groupId: z.string().optional(),
  status: z.enum(["open", "resolved"]).optional(),
});
