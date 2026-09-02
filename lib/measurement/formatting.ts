import type {
  LinearUnit,
  AreaUnit,
  VolumeUnit,
  ArchitecturalDenominator,
  Measurement,
  Calibration,
  AreaMeasurement,
  VolumeMeasurement,
} from "./types";
import { fromMillimeters, fromSquareMillimeters, fromCubicMillimeters } from "./units";
import { formatArchitectural } from "./architectural-format";
import {
  calculateLinearMm,
  calculatePolylineMm,
  calculatePerimeterMm,
  calculateAreaMm2,
  calculateVolumeMm3,
  calculateRadiusMm,
  calculateAngleDeg,
} from "./calculations";

// ─── Linear ───────────────────────────────────────────────────────────────────
export function formatLinear(
  mm: number,
  unit: LinearUnit,
  precision: number,
  archDenom?: ArchitecturalDenominator
): string {
  if (!isFinite(mm)) return "—";

  if (archDenom && unit === "foot") {
    const feet = fromMillimeters(mm, "foot");
    return formatArchitectural(feet, archDenom);
  }

  const value = fromMillimeters(mm, unit);
  const label = linearUnitLabel(unit);
  return `${value.toFixed(precision)} ${label}`;
}

function linearUnitLabel(unit: LinearUnit): string {
  switch (unit) {
    case "millimeter": return "mm";
    case "centimeter": return "cm";
    case "meter": return "m";
    case "inch": return "\"";
    case "foot": return "'";
  }
}

// ─── Area ─────────────────────────────────────────────────────────────────────
export function formatArea(
  mm2: number,
  unit: AreaUnit,
  precision: number
): string {
  if (!isFinite(mm2)) return "—";
  const value = fromSquareMillimeters(mm2, unit);
  const label = areaUnitLabel(unit);
  return `${value.toFixed(precision)} ${label}`;
}

function areaUnitLabel(unit: AreaUnit): string {
  switch (unit) {
    case "square-millimeter": return "mm²";
    case "square-centimeter": return "cm²";
    case "square-meter": return "m²";
    case "square-inch": return "sq in";
    case "square-foot": return "sq ft";
  }
}

// ─── Volume ───────────────────────────────────────────────────────────────────
export function formatVolume(
  mm3: number,
  unit: VolumeUnit,
  precision: number
): string {
  if (!isFinite(mm3)) return "—";
  const value = fromCubicMillimeters(mm3, unit);
  const label = volumeUnitLabel(unit);
  return `${value.toFixed(precision)} ${label}`;
}

function volumeUnitLabel(unit: VolumeUnit): string {
  switch (unit) {
    case "cubic-millimeter": return "mm³";
    case "cubic-centimeter": return "cm³";
    case "cubic-meter": return "m³";
    case "cubic-inch": return "cu in";
    case "cubic-foot": return "cu ft";
  }
}

// ─── Angle ────────────────────────────────────────────────────────────────────
export function formatAngle(degrees: number, precision: number): string {
  if (!isFinite(degrees)) return "—";
  return `${degrees.toFixed(precision)}°`;
}

// ─── Count ────────────────────────────────────────────────────────────────────
export function formatCount(n: number): string {
  return String(n);
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────
export function formatMeasurementQuantity(
  m: Measurement,
  cal: Calibration | null
): string {
  const needsCal = m.type !== "count" && m.type !== "angle";
  if (needsCal && cal === null) return "Uncalibrated";

  switch (m.type) {
    case "linear": {
      if (!cal) return "Uncalibrated";
      const mm = calculateLinearMm(m.start, m.end, cal);
      return formatLinear(mm, m.displayUnit, m.precision, cal.architecturalDenominator);
    }

    case "polyline": {
      if (!cal) return "Uncalibrated";
      const mm = calculatePolylineMm(m.points, cal);
      return formatLinear(mm, m.displayUnit, m.precision, cal.architecturalDenominator);
    }

    case "perimeter": {
      if (!cal) return "Uncalibrated";
      const mm = calculatePerimeterMm(m.points, cal);
      return formatLinear(mm, m.displayUnit, m.precision, cal.architecturalDenominator);
    }

    case "polygon-area":
    case "rectangle-area": {
      if (!cal) return "Uncalibrated";
      const geoTyped = m as AreaMeasurement;
      const mm2 = calculateAreaMm2(geoTyped.geometry, cal);
      return formatArea(mm2, m.displayUnit, m.precision);
    }

    case "volume": {
      if (!cal) return "Uncalibrated";
      const vTyped = m as VolumeMeasurement;
      const mm3 = calculateVolumeMm3(vTyped.geometry, vTyped.depthMillimeters, cal);
      return formatVolume(mm3, m.displayUnit, m.precision);
    }

    case "diameter": {
      if (!cal) return "Uncalibrated";
      const mm = calculateRadiusMm(m.center, m.edge, cal) * 2;
      return formatLinear(mm, m.displayUnit, m.precision, cal.architecturalDenominator);
    }

    case "radius": {
      if (!cal) return "Uncalibrated";
      const mm = calculateRadiusMm(m.center, m.edge, cal);
      return formatLinear(mm, m.displayUnit, m.precision, cal.architecturalDenominator);
    }

    case "angle": {
      const deg = calculateAngleDeg(m.vertex, m.start, m.end);
      return formatAngle(deg, m.precision);
    }

    case "count": {
      return formatCount(m.points.length);
    }
  }
}
