import type {
  LinearUnit,
  AreaUnit,
  VolumeUnit,
  UnitSystem,
  Calibration,
} from "./types";
import type { NormalizedPoint } from "@/lib/markup/types";

// ─── Conversion factors TO millimeters ────────────────────────────────────────
const MM_PER_LINEAR: Record<LinearUnit, number> = {
  millimeter: 1,
  centimeter: 10,
  meter: 1000,
  inch: 25.4,
  foot: 304.8,
};

const MM2_PER_AREA: Record<AreaUnit, number> = {
  "square-millimeter": 1,
  "square-centimeter": 100,
  "square-meter": 1_000_000,
  "square-inch": 25.4 * 25.4,
  "square-foot": 304.8 * 304.8,
};

const MM3_PER_VOLUME: Record<VolumeUnit, number> = {
  "cubic-millimeter": 1,
  "cubic-centimeter": 1_000,
  "cubic-meter": 1_000_000_000,
  "cubic-inch": 25.4 * 25.4 * 25.4,
  "cubic-foot": 304.8 * 304.8 * 304.8,
};

// ─── Linear ───────────────────────────────────────────────────────────────────
export function toMillimeters(value: number, unit: LinearUnit): number {
  return value * MM_PER_LINEAR[unit];
}

export function fromMillimeters(mm: number, unit: LinearUnit): number {
  return mm / MM_PER_LINEAR[unit];
}

// ─── Area ─────────────────────────────────────────────────────────────────────
export function toSquareMillimeters(value: number, unit: AreaUnit): number {
  return value * MM2_PER_AREA[unit];
}

export function fromSquareMillimeters(mm2: number, unit: AreaUnit): number {
  return mm2 / MM2_PER_AREA[unit];
}

// ─── Volume ───────────────────────────────────────────────────────────────────
export function toCubicMillimeters(value: number, unit: VolumeUnit): number {
  return value * MM3_PER_VOLUME[unit];
}

export function fromCubicMillimeters(mm3: number, unit: VolumeUnit): number {
  return mm3 / MM3_PER_VOLUME[unit];
}

// ─── Calibration-based conversion ─────────────────────────────────────────────
/**
 * Convert a Euclidean distance measured in normalized 0..1 space to millimeters.
 * calibration.pageUnitsPerMillimeter = (normalized distance of calibration segment)
 *   divided by knownDistanceMillimeters.
 * So: mm = normalizedDist / pageUnitsPerMillimeter
 */
export function normalizedToMillimeters(
  normalizedDist: number,
  calibration: Calibration
): number {
  if (calibration.pageUnitsPerMillimeter === 0) return 0;
  return normalizedDist / calibration.pageUnitsPerMillimeter;
}

/**
 * Compute euclidean distance between two normalized points (helper used in calibration).
 */
export function normalizedDistance(a: NormalizedPoint, b: NormalizedPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Unit system detection ─────────────────────────────────────────────────────
export function unitSystemOf(unit: LinearUnit | AreaUnit | VolumeUnit): UnitSystem {
  const metricLinear: LinearUnit[] = ["millimeter", "centimeter", "meter"];
  const metricArea: AreaUnit[] = ["square-millimeter", "square-centimeter", "square-meter"];
  const metricVolume: VolumeUnit[] = ["cubic-millimeter", "cubic-centimeter", "cubic-meter"];

  if (
    (metricLinear as string[]).includes(unit) ||
    (metricArea as string[]).includes(unit) ||
    (metricVolume as string[]).includes(unit)
  ) {
    return "metric";
  }
  // All imperial units default to imperial-decimal; caller can override to architectural
  return "imperial-decimal";
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
export function defaultLinearUnit(system: UnitSystem): LinearUnit {
  switch (system) {
    case "metric": return "meter";
    case "imperial-architectural": return "foot";
    case "imperial-decimal": return "foot";
  }
}

export function defaultAreaUnit(system: UnitSystem): AreaUnit {
  switch (system) {
    case "metric": return "square-meter";
    case "imperial-architectural": return "square-foot";
    case "imperial-decimal": return "square-foot";
  }
}

export function defaultVolumeUnit(system: UnitSystem): VolumeUnit {
  switch (system) {
    case "metric": return "cubic-meter";
    case "imperial-architectural": return "cubic-foot";
    case "imperial-decimal": return "cubic-foot";
  }
}
