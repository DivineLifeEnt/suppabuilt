import { measurementsToCsv } from "@/lib/measurement/csv-export";
import type { Calibration, MeasurementGroup } from "@/lib/measurement/types";
import {
  getMeasurementRepository,
  getCalibrationRepository,
  getMeasurementGroupRepository,
} from "./repositories";

export async function exportCsv(planId: string, pageNumber?: number): Promise<string> {
  const mRepo = getMeasurementRepository();
  const cRepo = getCalibrationRepository();
  const gRepo = getMeasurementGroupRepository();

  const [measurements, calibrations, groups] = await Promise.all([
    mRepo.list(planId, pageNumber),
    cRepo.list(planId),
    gRepo.list(planId),
  ]);

  const calMap = new Map<string, Calibration>(calibrations.map((c) => [c.id, c]));
  const groupMap = new Map<string, MeasurementGroup>(groups.map((g) => [g.id, g]));

  return measurementsToCsv(measurements, calMap, groupMap);
}
