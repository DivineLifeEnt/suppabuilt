import type {
  Measurement,
  CreateMeasurementInput,
  UpdateMeasurementInput,
} from "@/lib/measurement/types";
import {
  validateLinear,
  validatePolyline,
  validateArea,
  validateDepth,
} from "@/lib/measurement/validation";
import { formatMeasurementQuantity } from "@/lib/measurement/formatting";
import {
  getMeasurementRepository,
  getCalibrationRepository,
} from "./repositories";

// ─── Validate geometry ────────────────────────────────────────────────────────
function validateGeometry(input: CreateMeasurementInput | UpdateMeasurementInput & { type: string }): void {
  const type = "type" in input ? input.type : undefined;
  if (!type) return;

  if (type === "linear" && "start" in input && input.start && "end" in input && input.end) {
    const r = validateLinear(input.start, input.end);
    if (!r.valid) throw new Error(r.error);
  }
  if ((type === "polyline" || type === "perimeter") && "points" in input && input.points) {
    const r = validatePolyline(input.points);
    if (!r.valid) throw new Error(r.error);
  }
  if ((type === "polygon-area" || type === "rectangle-area") && "geometry" in input && input.geometry) {
    const geo = input.geometry as { kind: string; points?: { x: number; y: number }[] };
    if (geo.kind === "polygon" && geo.points) {
      const r = validateArea(geo.points);
      if (!r.valid) throw new Error(r.error);
    }
  }
  if (type === "volume") {
    if ("geometry" in input && input.geometry) {
      const geo = input.geometry as { kind: string; points?: { x: number; y: number }[] };
      if (geo.kind === "polygon" && geo.points) {
        const r = validateArea(geo.points);
        if (!r.valid) throw new Error(r.error);
      }
    }
    if ("depthMillimeters" in input && input.depthMillimeters != null) {
      const r = validateDepth(input.depthMillimeters);
      if (!r.valid) throw new Error(r.error);
    }
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createMeasurement(
  input: CreateMeasurementInput
): Promise<Measurement> {
  validateGeometry(input);
  const repo = getMeasurementRepository();
  return repo.create(input);
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateMeasurement(
  id: string,
  input: UpdateMeasurementInput,
  expectedRevision: number
): Promise<Measurement> {
  const repo = getMeasurementRepository();
  const existing = await repo.get(id);
  if (!existing) throw new Error(`Measurement ${id} not found`);

  // Validate geometry patches
  validateGeometry({ ...existing, ...input } as CreateMeasurementInput);

  return repo.update(id, input, expectedRevision);
}

// ─── Get with quantities ──────────────────────────────────────────────────────
export type MeasurementWithQuantity = Measurement & { formattedQuantity: string };

export async function getMeasurementsWithQuantities(
  planId: string,
  pageNumber?: number
): Promise<MeasurementWithQuantity[]> {
  const mRepo = getMeasurementRepository();
  const cRepo = getCalibrationRepository();

  const measurements = await mRepo.list(planId, pageNumber);
  const calibrations = await cRepo.list(planId);

  const calMap = new Map(calibrations.map((c) => [c.id, c]));

  return measurements.map((m) => {
    const cal = m.calibrationId ? calMap.get(m.calibrationId) ?? null : null;
    return {
      ...m,
      formattedQuantity: formatMeasurementQuantity(m, cal),
    };
  });
}
