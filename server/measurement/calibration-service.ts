import type {
  Calibration,
  CreateCalibrationInput,
  UpdateCalibrationInput,
  Measurement,
} from "@/lib/measurement/types";
import { validateCalibration } from "@/lib/measurement/validation";
import { normalizedDistance } from "@/lib/measurement/units";
import { formatMeasurementQuantity } from "@/lib/measurement/formatting";
import {
  getCalibrationRepository,
  getMeasurementRepository,
} from "./repositories";

// ─── Create calibration ───────────────────────────────────────────────────────
export async function createCalibration(input: CreateCalibrationInput): Promise<Calibration> {
  const result = validateCalibration(
    input.normalizedStart,
    input.normalizedEnd,
    input.knownDistanceMillimeters
  );
  if (!result.valid) {
    throw new Error(result.error);
  }

  const repo = getCalibrationRepository();
  return repo.create(input);
}

// ─── Get page calibration ─────────────────────────────────────────────────────
/**
 * Returns the page-specific calibration if it exists, then falls back to
 * the document-default (pageNumber = null). Returns null if neither exists.
 */
export async function getPageCalibration(
  planId: string,
  pageNumber: number
): Promise<Calibration | null> {
  const repo = getCalibrationRepository();
  const all = await repo.list(planId);

  // Look for page-specific first
  const pageCal = all.find((c) => c.pageNumber === pageNumber);
  if (pageCal) return pageCal;

  // Fall back to document-default
  const docDefault = all.find((c) => c.pageNumber === null);
  return docDefault ?? null;
}

// ─── Rescale preview ──────────────────────────────────────────────────────────
export type RescalePreviewItem = {
  id: string;
  label: string | null;
  type: Measurement["type"];
  oldQuantity: string;
  newQuantity: string;
};

export async function rescalePreview(
  calibrationId: string,
  newInput: UpdateCalibrationInput
): Promise<{ items: RescalePreviewItem[] }> {
  const calRepo = getCalibrationRepository();
  const mRepo = getMeasurementRepository();

  const cal = await calRepo.get(calibrationId);
  if (!cal) throw new Error(`Calibration ${calibrationId} not found`);

  // Build the hypothetical new calibration
  const start = newInput.normalizedStart ?? cal.normalizedStart;
  const end = newInput.normalizedEnd ?? cal.normalizedEnd;
  const dist = newInput.knownDistanceMillimeters ?? cal.knownDistanceMillimeters;
  const normDist = normalizedDistance(start, end);
  const newCal: Calibration = {
    ...cal,
    ...newInput,
    pageUnitsPerMillimeter: normDist / dist,
  };

  // Find all measurements referencing this calibration
  const measurements = await mRepo.list(cal.planId);
  const referenced = measurements.filter((m) => m.calibrationId === calibrationId);

  const items: RescalePreviewItem[] = referenced.map((m) => ({
    id: m.id,
    label: m.label,
    type: m.type,
    oldQuantity: formatMeasurementQuantity(m, cal),
    newQuantity: formatMeasurementQuantity(m, newCal),
  }));

  return { items };
}

// ─── Apply rescale ────────────────────────────────────────────────────────────
export async function rescale(
  calibrationId: string,
  newInput: UpdateCalibrationInput,
  options: { reassignMeasurementIds?: string[] } = {}
): Promise<{ calibration: Calibration; updatedMeasurementCount: number }> {
  const calRepo = getCalibrationRepository();
  const mRepo = getMeasurementRepository();

  const cal = await calRepo.get(calibrationId);
  if (!cal) throw new Error(`Calibration ${calibrationId} not found`);

  const updatedCal = await calRepo.update(calibrationId, newInput, cal.revision);

  let updatedMeasurementCount = 0;

  if (options.reassignMeasurementIds && options.reassignMeasurementIds.length > 0) {
    for (const id of options.reassignMeasurementIds) {
      const m = await mRepo.get(id);
      if (!m) continue;
      await mRepo.update(id, { groupId: m.groupId }, m.revision);
      updatedMeasurementCount++;
    }
  }

  return { calibration: updatedCal, updatedMeasurementCount };
}
