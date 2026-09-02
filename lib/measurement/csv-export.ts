import type { Measurement, Calibration, MeasurementGroup } from "./types";
import { formatMeasurementQuantity } from "./formatting";
import { linearUnitCode, areaUnitCode, volumeUnitCode } from "./csv-unit-labels";

// ─── CSV escaping ─────────────────────────────────────────────────────────────
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function escapeCsvField(value: string): string {
  // Prepend ' to prevent formula injection
  let escaped = value;
  if (FORMULA_PREFIXES.some((p) => escaped.startsWith(p))) {
    escaped = `'${escaped}`;
  }
  // If the field contains commas, newlines, or quotes, wrap in quotes and escape internal quotes
  if (escaped.includes('"') || escaped.includes(",") || escaped.includes("\n") || escaped.includes("\r")) {
    escaped = `"${escaped.replace(/"/g, '""')}"`;
  }
  return escaped;
}

// ─── Unit label helpers ───────────────────────────────────────────────────────
function measurementUnit(m: Measurement): string {
  switch (m.type) {
    case "linear":
    case "polyline":
    case "perimeter":
    case "diameter":
    case "radius":
      return linearUnitCode(m.displayUnit);
    case "polygon-area":
    case "rectangle-area":
      return areaUnitCode(m.displayUnit);
    case "volume":
      return volumeUnitCode(m.displayUnit);
    case "angle":
      return "°";
    case "count":
      return "count";
  }
}

// ─── CSV export ───────────────────────────────────────────────────────────────
const HEADERS = [
  "ID",
  "Type",
  "Label",
  "Prefix",
  "Suffix",
  "Quantity",
  "Unit",
  "Page",
  "Group",
  "Status",
  "Created",
  "Updated",
];

export function measurementsToCsv(
  measurements: Measurement[],
  calibrations: Map<string, Calibration>,
  groups: Map<string, MeasurementGroup>
): string {
  const rows: string[] = [HEADERS.join(",")];

  // Sort for determinism: page, then zIndex, then id
  const sorted = [...measurements].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
    return a.id.localeCompare(b.id);
  });

  for (const m of sorted) {
    const cal = m.calibrationId ? calibrations.get(m.calibrationId) ?? null : null;
    const group = m.groupId ? groups.get(m.groupId) : undefined;

    const quantity = formatMeasurementQuantity(m, cal);
    const unit = measurementUnit(m);

    const row = [
      escapeCsvField(m.id),
      escapeCsvField(m.type),
      escapeCsvField(m.label ?? ""),
      escapeCsvField(m.prefix ?? ""),
      escapeCsvField(m.suffix ?? ""),
      escapeCsvField(quantity),
      escapeCsvField(unit),
      escapeCsvField(String(m.pageNumber)),
      escapeCsvField(group?.name ?? ""),
      escapeCsvField(m.status),
      escapeCsvField(m.createdAt),
      escapeCsvField(m.updatedAt),
    ];

    rows.push(row.join(","));
  }

  return rows.join("\n");
}
