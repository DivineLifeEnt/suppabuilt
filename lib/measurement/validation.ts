import type { NormalizedPoint } from "@/lib/markup/types";
import {
  distance,
  isValidNormalizedPoint,
  isSelfIntersecting,
} from "./geometry";

// ─── Result type ─────────────────────────────────────────────────────────────
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

// ─── Calibration ─────────────────────────────────────────────────────────────
export function validateCalibration(
  start: NormalizedPoint,
  end: NormalizedPoint,
  knownDistanceMm: number
): ValidationResult {
  if (!isValidNormalizedPoint(start)) {
    return { valid: false, error: "Start point must be in 0..1 range" };
  }
  if (!isValidNormalizedPoint(end)) {
    return { valid: false, error: "End point must be in 0..1 range" };
  }

  const d = distance(start, end);
  if (d < 1e-8) {
    return { valid: false, error: "Calibration segment must have non-zero length" };
  }

  if (!isFinite(knownDistanceMm) || isNaN(knownDistanceMm)) {
    return { valid: false, error: "Known distance must be a finite number" };
  }
  if (knownDistanceMm <= 0) {
    return { valid: false, error: "Known distance must be greater than zero" };
  }

  return { valid: true };
}

// ─── Linear ──────────────────────────────────────────────────────────────────
export function validateLinear(
  start: NormalizedPoint,
  end: NormalizedPoint
): ValidationResult {
  if (!isValidNormalizedPoint(start)) {
    return { valid: false, error: "Start point must be in 0..1 range" };
  }
  if (!isValidNormalizedPoint(end)) {
    return { valid: false, error: "End point must be in 0..1 range" };
  }
  if (distance(start, end) < 1e-8) {
    return { valid: false, error: "Linear measurement must have non-zero length" };
  }
  return { valid: true };
}

// ─── Polyline ────────────────────────────────────────────────────────────────
export function validatePolyline(points: NormalizedPoint[]): ValidationResult {
  if (points.length < 2) {
    return { valid: false, error: "Polyline requires at least 2 points" };
  }
  for (const pt of points) {
    if (!isValidNormalizedPoint(pt)) {
      return { valid: false, error: "All points must be in 0..1 range" };
    }
  }
  // Check for duplicate consecutive points
  for (let i = 0; i < points.length - 1; i++) {
    if (distance(points[i], points[i + 1]) < 1e-8) {
      return { valid: false, error: "Polyline cannot have duplicate consecutive points" };
    }
  }
  return { valid: true };
}

// ─── Area (polygon) ───────────────────────────────────────────────────────────
export function validateArea(points: NormalizedPoint[]): ValidationResult {
  if (points.length < 3) {
    return { valid: false, error: "Area polygon requires at least 3 points" };
  }
  for (const pt of points) {
    if (!isValidNormalizedPoint(pt)) {
      return { valid: false, error: "All points must be in 0..1 range" };
    }
  }
  if (isSelfIntersecting(points)) {
    return { valid: false, error: "Polygon cannot self-intersect" };
  }
  return { valid: true };
}

// ─── Volume depth ─────────────────────────────────────────────────────────────
export function validateVolume(depthMm: number): ValidationResult {
  return validateDepth(depthMm);
}

export function validateDepth(depthMm: number): ValidationResult {
  if (!isFinite(depthMm) || isNaN(depthMm)) {
    return { valid: false, error: "Depth must be a finite number" };
  }
  if (depthMm <= 0) {
    return { valid: false, error: "Depth must be greater than zero" };
  }
  return { valid: true };
}
