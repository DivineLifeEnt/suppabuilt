// Import primitives from markup/types — do NOT redefine them
export type { NormalizedPoint, NormalizedBounds } from "@/lib/markup/types";
import type { NormalizedPoint, NormalizedBounds } from "@/lib/markup/types";

// ─── Tool ─────────────────────────────────────────────────────────────────────
export type MeasurementTool =
  | "calibrate"
  | "linear"
  | "polyline"
  | "perimeter"
  | "polygon-area"
  | "rectangle-area"
  | "volume"
  | "diameter"
  | "radius"
  | "angle"
  | "count";

// ─── Unit systems ─────────────────────────────────────────────────────────────
export type UnitSystem = "imperial-architectural" | "imperial-decimal" | "metric";

export type LinearUnit = "millimeter" | "centimeter" | "meter" | "inch" | "foot";
export type AreaUnit =
  | "square-millimeter"
  | "square-centimeter"
  | "square-meter"
  | "square-inch"
  | "square-foot";
export type VolumeUnit =
  | "cubic-millimeter"
  | "cubic-centimeter"
  | "cubic-meter"
  | "cubic-inch"
  | "cubic-foot";

export type ArchitecturalDenominator = 2 | 4 | 8 | 16 | 32 | 64;

// ─── Author ───────────────────────────────────────────────────────────────────
export type MeasurementAuthor = { name: string };

// ─── Calibration ──────────────────────────────────────────────────────────────
export type Calibration = {
  id: string;
  planId: string;
  pageNumber: number | null; // null = document-default
  name: string;
  normalizedStart: NormalizedPoint;
  normalizedEnd: NormalizedPoint;
  knownDistanceMillimeters: number;
  /** derived: euclidean distance in 0..1 space / knownDistanceMm */
  pageUnitsPerMillimeter: number;
  unitSystem: UnitSystem;
  displayUnit: LinearUnit;
  precision: number;
  architecturalDenominator?: ArchitecturalDenominator;
  revision: number;
  createdBy: MeasurementAuthor;
  createdAt: string;
  updatedAt: string;
};

// ─── Style ────────────────────────────────────────────────────────────────────
export type MeasurementStyle = {
  stroke: string;
  strokeWidth: number;
  fill: string | null;
  opacity: number;
  fontSize: number;
  labelPosition: "auto" | "center" | "start" | "end";
};

export const DEFAULT_MEASUREMENT_STYLE: MeasurementStyle = {
  stroke: "#F59E0B",
  strokeWidth: 2,
  fill: "#F59E0B22",
  opacity: 1,
  fontSize: 12,
  labelPosition: "auto",
};

// ─── Status ───────────────────────────────────────────────────────────────────
export type MeasurementStatus = "open" | "resolved";

// ─── Base ─────────────────────────────────────────────────────────────────────
export type MeasurementBase = {
  id: string;
  planId: string;
  pageNumber: number;
  calibrationId: string | null;
  label: string | null;
  prefix: string | null;
  suffix: string | null;
  style: MeasurementStyle;
  locked: boolean;
  visible: boolean;
  status: MeasurementStatus;
  groupId: string | null;
  zIndex: number;
  revision: number;
  createdBy: MeasurementAuthor;
  createdAt: string;
  updatedAt: string;
};

// ─── Concrete measurement types ───────────────────────────────────────────────
export type LinearMeasurement = MeasurementBase & {
  type: "linear";
  start: NormalizedPoint;
  end: NormalizedPoint;
  displayUnit: LinearUnit;
  precision: number;
};

export type PolylineMeasurement = MeasurementBase & {
  type: "polyline" | "perimeter";
  points: NormalizedPoint[];
  closed: boolean;
  displayUnit: LinearUnit;
  precision: number;
};

export type AreaMeasurement = MeasurementBase & {
  type: "polygon-area" | "rectangle-area";
  geometry:
    | { kind: "polygon"; points: NormalizedPoint[] }
    | { kind: "bounds"; bounds: NormalizedBounds; rotation: number };
  displayUnit: AreaUnit;
  precision: number;
};

export type VolumeMeasurement = MeasurementBase & {
  type: "volume";
  geometry:
    | { kind: "polygon"; points: NormalizedPoint[] }
    | { kind: "bounds"; bounds: NormalizedBounds; rotation: number };
  depthMillimeters: number;
  displayUnit: VolumeUnit;
  precision: number;
};

export type CircularMeasurement = MeasurementBase & {
  type: "diameter" | "radius";
  center: NormalizedPoint;
  edge: NormalizedPoint;
  displayUnit: LinearUnit;
  precision: number;
};

export type AngleMeasurement = MeasurementBase & {
  type: "angle";
  vertex: NormalizedPoint;
  start: NormalizedPoint;
  end: NormalizedPoint;
  precision: number;
};

export type CountMeasurement = MeasurementBase & {
  type: "count";
  points: NormalizedPoint[];
};

export type Measurement =
  | LinearMeasurement
  | PolylineMeasurement
  | AreaMeasurement
  | VolumeMeasurement
  | CircularMeasurement
  | AngleMeasurement
  | CountMeasurement;

// ─── Group ────────────────────────────────────────────────────────────────────
export type MeasurementGroup = {
  id: string;
  planId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Input types ─────────────────────────────────────────────────────────────
export type CreateMeasurementInput = Omit<
  Measurement,
  "id" | "revision" | "createdAt" | "updatedAt" | "createdBy"
> & { createdBy?: MeasurementAuthor };

export type UpdateMeasurementInput = {
  label?: string | null;
  prefix?: string | null;
  suffix?: string | null;
  style?: Partial<MeasurementStyle>;
  locked?: boolean;
  visible?: boolean;
  status?: MeasurementStatus;
  groupId?: string | null;
  zIndex?: number;
  // geometry patches — type-specific, apply whichever are present
  start?: NormalizedPoint;
  end?: NormalizedPoint;
  points?: NormalizedPoint[];
  center?: NormalizedPoint;
  edge?: NormalizedPoint;
  vertex?: NormalizedPoint;
  geometry?: AreaMeasurement["geometry"] | VolumeMeasurement["geometry"];
  depthMillimeters?: number;
  displayUnit?: LinearUnit | AreaUnit | VolumeUnit;
  precision?: number;
};

export type CreateCalibrationInput = Omit<
  Calibration,
  "id" | "revision" | "createdAt" | "updatedAt" | "createdBy" | "pageUnitsPerMillimeter"
> & { createdBy?: MeasurementAuthor };

export type UpdateCalibrationInput = Partial<
  Omit<Calibration, "id" | "planId" | "revision" | "createdAt" | "updatedAt" | "createdBy" | "pageUnitsPerMillimeter">
>;

export type CreateGroupInput = Omit<MeasurementGroup, "id" | "createdAt" | "updatedAt">;
export type UpdateGroupInput = Partial<Pick<MeasurementGroup, "name" | "color">>;

// ─── Batch ────────────────────────────────────────────────────────────────────
export type MeasurementBatchItem =
  | { op: "create"; input: CreateMeasurementInput }
  | { op: "update"; id: string; input: UpdateMeasurementInput; expectedRevision: number }
  | { op: "delete"; id: string; expectedRevision: number };

export type MeasurementBatchInput = { items: MeasurementBatchItem[] };

export type MeasurementBatchResultItem =
  | { op: "create"; measurement: Measurement }
  | { op: "update"; measurement: Measurement }
  | { op: "delete"; id: string }
  | { op: "error"; index: number; code: string; message: string };

export type MeasurementBatchResult = { results: MeasurementBatchResultItem[] };
