import type { LinearUnit, AreaUnit, VolumeUnit } from "./types";

export function linearUnitCode(unit: LinearUnit): string {
  switch (unit) {
    case "millimeter": return "mm";
    case "centimeter": return "cm";
    case "meter": return "m";
    case "inch": return "in";
    case "foot": return "ft";
  }
}

export function areaUnitCode(unit: AreaUnit): string {
  switch (unit) {
    case "square-millimeter": return "mm²";
    case "square-centimeter": return "cm²";
    case "square-meter": return "m²";
    case "square-inch": return "sq in";
    case "square-foot": return "sq ft";
  }
}

export function volumeUnitCode(unit: VolumeUnit): string {
  switch (unit) {
    case "cubic-millimeter": return "mm³";
    case "cubic-centimeter": return "cm³";
    case "cubic-meter": return "m³";
    case "cubic-inch": return "cu in";
    case "cubic-foot": return "cu ft";
  }
}
