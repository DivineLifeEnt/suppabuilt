import { z } from "zod";

const decimalPattern = /^-?\d+(\.\d+)?$/;
const nonNegDecimalPattern = /^\d+(\.\d+)?$/;

export const CreateEstimateSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(200),
  currency: z.string().length(3).default("USD"),
  description: z.string().max(500).optional(),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("blank") }),
    z.object({ kind: z.literal("takeoff"), takeoffGroupIds: z.array(z.string()).min(1).max(500) }),
    z.object({ kind: z.literal("copy"), fromVersionId: z.string() }),
  ]).default({ kind: "blank" }),
});

export const UpdateEstimateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
});

export const CreateEstimateSectionSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().default(0),
});

export const UpdateEstimateSectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().nullable().optional(),
});

export const CreateEstimateLineSchema = z.object({
  sectionId: z.string().optional(),
  costCode: z.string().max(50).optional(),
  description: z.string().min(1).max(500),
  category: z.enum([
    "material", "labor", "equipment", "subcontract",
    "freight", "consumable", "permit", "rental", "allowance", "other",
  ]).default("material"),
  quantity: z.string().regex(decimalPattern).default("1"),
  unit: z.string(),
  unitMaterialCost: z.string().regex(nonNegDecimalPattern).default("0"),
  laborHoursPerUnit: z.string().regex(nonNegDecimalPattern).default("0"),
  burdenedLaborRate: z.string().regex(nonNegDecimalPattern).default("0"),
  unitEquipmentCost: z.string().regex(nonNegDecimalPattern).default("0"),
  unitSubcontractCost: z.string().regex(nonNegDecimalPattern).default("0"),
  unitOtherCost: z.string().regex(nonNegDecimalPattern).default("0"),
  wastePercent: z.string().regex(nonNegDecimalPattern).default("0"),
  notes: z.string().max(1000).optional(),
  included: z.boolean().default(true),
  sourceSnapshotId: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const UpdateEstimateLineSchema = CreateEstimateLineSchema.partial();

export const CreateAdjustmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fixed"),
    label: z.string().min(1).max(200),
    amount: z.string().regex(decimalPattern),
    currency: z.string().length(3),
    basis: z.enum(["all-direct","material","labor","equipment","subcontract","other","custom"]),
    taxable: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  }),
  z.object({
    kind: z.literal("markup"),
    label: z.string().min(1).max(200),
    rate: z.string().regex(nonNegDecimalPattern),
    basis: z.enum(["all-direct","material","labor","equipment","subcontract","other","custom"]),
    taxable: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  }),
  z.object({
    kind: z.literal("margin"),
    label: z.string().min(1).max(200),
    rate: z.string().regex(nonNegDecimalPattern),
    basis: z.enum(["all-direct","material","labor","equipment","subcontract","other","custom"]),
    taxable: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  }),
  z.object({
    kind: z.literal("tax"),
    label: z.string().min(1).max(200),
    rate: z.string().regex(nonNegDecimalPattern),
    basis: z.enum(["all-direct","material","labor","equipment","subcontract","other","custom"]),
    taxable: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  }),
]);

// UpdateAdjustmentSchema: a loose object with all fields optional (discriminated union doesn't support .partial())
export const UpdateAdjustmentSchema = z.object({
  kind: z.enum(["fixed", "markup", "margin", "tax"]).optional(),
  label: z.string().min(1).max(200).optional(),
  amount: z.string().regex(decimalPattern).optional(),
  currency: z.string().length(3).optional(),
  rate: z.string().regex(nonNegDecimalPattern).optional(),
  basis: z.enum(["all-direct","material","labor","equipment","subcontract","other","custom"]).optional(),
  taxable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const CreateExportJobSchema = z.object({
  projectId: z.string(),
  exportType: z.enum([
    "flattened-plan-pdf",
    "markup-report-pdf", "markup-report-csv", "markup-report-xlsx",
    "measurement-report-pdf", "measurement-report-csv", "measurement-report-xlsx",
    "takeoff-csv", "takeoff-xlsx",
    "estimate-internal-xlsx", "estimate-customer-pdf", "estimate-detail-pdf",
    "estimate-csv", "estimate-comparison-report",
  ]),
  sourceIds: z.array(z.string()).min(1).max(100),
  templateId: z.string().optional(),
  idempotencyKey: z.string().min(1).max(200),
  versionId: z.string().optional(),
  includeInternal: z.boolean().default(true),
});

export const SubmitReviewSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const RequestChangesSchema = z.object({
  comment: z.string().min(1).max(2000),
});

export const ApproveSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const RefreshApplySchema = z.object({
  selectedItemIds: z.array(z.string()).min(1),
  idempotencyKey: z.string().min(1).max(200),
});

export const CreateCostCodeSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  active: z.boolean().default(true),
});

export const CreateLaborRateSchema = z.object({
  classification: z.string().min(1).max(100),
  burdenedRate: z.string().regex(nonNegDecimalPattern),
  currency: z.string().length(3).default("USD"),
  effectiveDate: z.string().datetime(),
  active: z.boolean().default(true),
});

export const CreateExportTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  exportType: z.string(),
  isCustomerFacing: z.boolean().default(false),
  configJson: z.string(),
  active: z.boolean().default(true),
});
