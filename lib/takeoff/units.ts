import type { QuantityUnit } from "./types";

// Conversion factors
const MM_PER_FOOT = 304.8;
const MM_PER_INCH = 25.4;
const MM_PER_METER = 1000;
const MM2_PER_SQFT = MM_PER_FOOT * MM_PER_FOOT;
const MM2_PER_SQMETER = MM_PER_METER * MM_PER_METER;
const MM3_PER_CUFT = MM_PER_FOOT ** 3;
const MM3_PER_CUMETER = MM_PER_METER ** 3;

/** Is this unit compatible with linear source geometry? */
export function isLinearUnit(unit: QuantityUnit): boolean {
  return (
    unit === "linear-foot" ||
    unit === "linear-inch" ||
    unit === "linear-meter"
  );
}

/** Is this unit compatible with area source geometry? */
export function isAreaUnit(unit: QuantityUnit): boolean {
  return unit === "square-foot" || unit === "square-meter";
}

/** Is this unit a volume unit? */
export function isVolumeUnit(unit: QuantityUnit): boolean {
  return unit === "cubic-foot" || unit === "cubic-meter";
}

/** Is this unit a count unit? */
export function isCountUnit(unit: QuantityUnit): boolean {
  return unit === "each";
}

/**
 * Convert calibrated measurement mm value to a QuantityUnit.
 * Returns a decimal string.
 */
export function mmToQuantityUnit(mm: number, unit: QuantityUnit): string {
  let value: number;
  switch (unit) {
    case "linear-foot":
      value = mm / MM_PER_FOOT;
      break;
    case "linear-inch":
      value = mm / MM_PER_INCH;
      break;
    case "linear-meter":
      value = mm / MM_PER_METER;
      break;
    default:
      throw new Error(`Cannot convert mm to unit: ${unit}`);
  }
  return value.toFixed(6);
}

/**
 * Convert calibrated area measurement mm² value to a QuantityUnit.
 * Returns a decimal string.
 */
export function mm2ToQuantityUnit(mm2: number, unit: QuantityUnit): string {
  let value: number;
  switch (unit) {
    case "square-foot":
      value = mm2 / MM2_PER_SQFT;
      break;
    case "square-meter":
      value = mm2 / MM2_PER_SQMETER;
      break;
    default:
      throw new Error(`Cannot convert mm² to unit: ${unit}`);
  }
  return value.toFixed(6);
}

/**
 * Convert mm³ to a volume unit.
 */
export function mm3ToQuantityUnit(mm3: number, unit: QuantityUnit): string {
  let value: number;
  switch (unit) {
    case "cubic-foot":
      value = mm3 / MM3_PER_CUFT;
      break;
    case "cubic-meter":
      value = mm3 / MM3_PER_CUMETER;
      break;
    default:
      throw new Error(`Cannot convert mm³ to unit: ${unit}`);
  }
  return value.toFixed(6);
}

/** Human-readable label for a QuantityUnit */
export function quantityUnitLabel(unit: QuantityUnit): string {
  switch (unit) {
    case "each": return "ea";
    case "linear-foot": return "LF";
    case "linear-inch": return "LI";
    case "linear-meter": return "LM";
    case "square-foot": return "SF";
    case "square-meter": return "SM";
    case "cubic-foot": return "CF";
    case "cubic-meter": return "CM";
    case "pound": return "lb";
    case "kilogram": return "kg";
    case "gallon": return "gal";
    case "liter": return "L";
    case "hour": return "hr";
  }
}
