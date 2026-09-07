import type { QuantityUnit } from "@/lib/takeoff/types";

export type EstimateStatus =
  | "draft"
  | "in-review"
  | "changes-requested"
  | "approved"
  | "locked"
  | "superseded"
  | "archived";

export type CostCategory =
  | "material"
  | "labor"
  | "equipment"
  | "subcontract"
  | "freight"
  | "consumable"
  | "permit"
  | "rental"
  | "allowance"
  | "other";

export type AdjustmentKind = "fixed" | "markup" | "margin" | "tax";
export type AdjustmentBasis =
  | "all-direct"
  | "material"
  | "labor"
  | "equipment"
  | "subcontract"
  | "other"
  | "custom";

/** amount = decimal string (never binary float), currency = ISO 4217 */
export type Money = { amount: string; currency: string };

export type EstimateLineInput = {
  quantity: string;            // decimal string
  unit: QuantityUnit;
  unitMaterialCost: string;
  laborHoursPerUnit: string;
  burdenedLaborRate: string;
  unitEquipmentCost: string;
  unitSubcontractCost: string;
  unitOtherCost: string;
  wastePercent: string;
};

export type EstimateLineTotals = {
  grossQuantity: string;
  materialCost: Money;
  laborHours: string;
  laborCost: Money;
  equipmentCost: Money;
  subcontractCost: Money;
  otherCost: Money;
  directCost: Money;
};

export type EstimateAdjustment =
  | { id: string; kind: "fixed"; amount: Money; basis: AdjustmentBasis; label: string; order: number; taxable: boolean; policySnapshot: unknown }
  | { id: string; kind: "markup"; rate: string; basis: AdjustmentBasis; label: string; order: number; taxable: boolean; policySnapshot: unknown }
  | { id: string; kind: "margin"; rate: string; basis: AdjustmentBasis; label: string; order: number; taxable: boolean; policySnapshot: unknown }
  | { id: string; kind: "tax"; rate: string; basis: AdjustmentBasis; label: string; order: number; taxable: boolean; policySnapshot: unknown };

export type ExportType =
  | "flattened-plan-pdf"
  | "markup-report-pdf"
  | "markup-report-csv"
  | "markup-report-xlsx"
  | "measurement-report-pdf"
  | "measurement-report-csv"
  | "measurement-report-xlsx"
  | "takeoff-csv"
  | "takeoff-xlsx"
  | "estimate-internal-xlsx"
  | "estimate-customer-pdf"
  | "estimate-detail-pdf"
  | "estimate-csv"
  | "estimate-comparison-report";

export type ExportJobStatus =
  | "queued"
  | "running"
  | "retrying"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired";

// ─── Domain types ─────────────────────────────────────────────────────────────

export type Estimate = {
  id: string;
  organizationId: string;
  projectId: string;
  estimateNumber: string;
  name: string;
  description: string | null;
  currency: string;
  status: EstimateStatus;
  currentVersionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EstimateVersion = {
  id: string;
  estimateId: string;
  versionNumber: number;
  status: EstimateStatus;
  currency: string;
  calculationPolicyVersion: string;
  createdBy: string;
  submittedBy: string | null;
  approvedBy: string | null;
  lockedBy: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type EstimateSection = {
  id: string;
  versionId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  depth: number;
  createdAt: string;
  updatedAt: string;
};

export type EstimateLine = {
  id: string;
  versionId: string;
  sectionId: string | null;
  costCode: string | null;
  description: string;
  category: CostCategory;
  quantity: string;
  unit: string;
  unitMaterialCost: string;
  laborHoursPerUnit: string;
  burdenedLaborRate: string;
  unitEquipmentCost: string;
  unitSubcontractCost: string;
  unitOtherCost: string;
  wastePercent: string;
  notes: string | null;
  included: boolean;
  isAlternate: boolean;
  alternateId: string | null;
  sortOrder: number;
  sourceSnapshotId: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type ExportJob = {
  id: string;
  organizationId: string;
  projectId: string;
  requestedBy: string;
  exportType: ExportType;
  status: ExportJobStatus;
  sourceIds: string[];
  templateId: string | null;
  parametersJson: string;
  idempotencyKey: string;
  progress: number;
  stage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  versionId: string | null;
  outputKey: string | null;
  outputChecksum: string | null;
  outputSizeBytes: number | null;
  expiresAt: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
};

export type Actor = {
  userId: string;
  orgId: string;
  name: string;
};
