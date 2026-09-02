import type { NormalizedPoint, NormalizedBounds } from "@/lib/markup/types";
import type { Calibration, AreaMeasurement, VolumeMeasurement } from "./types";
import {
  distance,
  polylineLength,
  perimeter,
  polygonArea,
  rectangleArea,
  volume,
  circleRadius,
  interiorAngle,
} from "./geometry";
import { normalizedToMillimeters } from "./units";

// ─── Linear ───────────────────────────────────────────────────────────────────
export function calculateLinearMm(
  start: NormalizedPoint,
  end: NormalizedPoint,
  cal: Calibration
): number {
  const normDist = distance(start, end);
  return normalizedToMillimeters(normDist, cal);
}

// ─── Polyline ─────────────────────────────────────────────────────────────────
export function calculatePolylineMm(
  points: NormalizedPoint[],
  cal: Calibration
): number {
  const normLen = polylineLength(points);
  return normalizedToMillimeters(normLen, cal);
}

// ─── Perimeter ────────────────────────────────────────────────────────────────
export function calculatePerimeterMm(
  points: NormalizedPoint[],
  cal: Calibration
): number {
  const normLen = perimeter(points);
  return normalizedToMillimeters(normLen, cal);
}

// ─── Area ─────────────────────────────────────────────────────────────────────
/**
 * Returns area in mm². Uses calibration to convert from normalized^2 to mm².
 */
export function calculateAreaMm2(
  geo: AreaMeasurement["geometry"],
  cal: Calibration
): number {
  let normArea: number;
  if (geo.kind === "polygon") {
    normArea = Math.abs(polygonArea(geo.points));
  } else {
    normArea = rectangleArea(geo.bounds);
  }

  // normalized area (0..1)^2 → mm²
  // pageUnitsPerMillimeter = normDist / mm
  // normArea = (normDist)^2 → mm² = normArea / (pageUnitsPerMillimeter^2)
  const upm = cal.pageUnitsPerMillimeter;
  if (upm === 0) return 0;
  return normArea / (upm * upm);
}

// ─── Volume ───────────────────────────────────────────────────────────────────
export function calculateVolumeMm3(
  geo: VolumeMeasurement["geometry"],
  depthMm: number,
  cal: Calibration
): number {
  const areaGeo: AreaMeasurement["geometry"] = geo;
  const areaMm2 = calculateAreaMm2(areaGeo, cal);
  return volume(areaMm2, depthMm);
}

// ─── Radius ───────────────────────────────────────────────────────────────────
export function calculateRadiusMm(
  center: NormalizedPoint,
  edge: NormalizedPoint,
  cal: Calibration
): number {
  const normR = circleRadius(center, edge);
  return normalizedToMillimeters(normR, cal);
}

// ─── Angle ────────────────────────────────────────────────────────────────────
export function calculateAngleDeg(
  vertex: NormalizedPoint,
  start: NormalizedPoint,
  end: NormalizedPoint
): number {
  return interiorAngle(vertex, start, end);
}
