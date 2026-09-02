import type {
  Measurement,
  Calibration,
  MeasurementGroup,
  CreateMeasurementInput,
  UpdateMeasurementInput,
  CreateCalibrationInput,
  UpdateCalibrationInput,
  CreateGroupInput,
  UpdateGroupInput,
  MeasurementBatchInput,
  MeasurementBatchResult,
} from "@/lib/measurement/types";

// ─── Errors (reuse ConflictError/NotFoundError from markup repo for API compat)
export class ConflictError extends Error {
  readonly code = "CONFLICT";
  constructor(public readonly revision: number) {
    super(`Revision conflict — expected ${revision}`);
  }
}

export class NotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor(id: string) {
    super(`Not found: ${id}`);
  }
}

export class DependencyError extends Error {
  readonly code = "DEPENDENCY";
  constructor(message: string) {
    super(message);
  }
}

// ─── Repository interfaces ─────────────────────────────────────────────────────

export interface MeasurementRepository {
  list(planId: string, pageNumber?: number, type?: string, groupId?: string): Promise<Measurement[]>;
  get(id: string): Promise<Measurement | null>;
  create(input: CreateMeasurementInput): Promise<Measurement>;
  update(id: string, input: UpdateMeasurementInput, expectedRevision: number): Promise<Measurement>;
  delete(id: string, expectedRevision: number): Promise<void>;
  batch(planId: string, input: MeasurementBatchInput): Promise<MeasurementBatchResult>;
}

export interface CalibrationRepository {
  list(planId: string, pageNumber?: number): Promise<Calibration[]>;
  get(id: string): Promise<Calibration | null>;
  create(input: CreateCalibrationInput): Promise<Calibration>;
  update(id: string, input: UpdateCalibrationInput, expectedRevision: number): Promise<Calibration>;
  delete(id: string, expectedRevision: number): Promise<void>;
}

export interface MeasurementGroupRepository {
  list(planId: string): Promise<MeasurementGroup[]>;
  get(id: string): Promise<MeasurementGroup | null>;
  create(input: CreateGroupInput): Promise<MeasurementGroup>;
  update(id: string, input: UpdateGroupInput): Promise<MeasurementGroup>;
  delete(id: string): Promise<void>;
}
