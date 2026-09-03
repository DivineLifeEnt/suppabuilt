import type { TakeoffItem, HvacCatalogItem, TakeoffFilter } from "./types";

// ─── Formula injection guard ───────────────────────────────────────────────────
/** Prefix formula-injection chars with ' to prevent spreadsheet execution */
export function escapeCsvField(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Prefix = + - @ and tab with a single quote
  if (/^[=+\-@\t]/.test(s)) {
    return `'${s}`;
  }
  // If contains comma, newline, or double-quote, wrap in double-quotes
  if (/[,"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ─── Column definitions ────────────────────────────────────────────────────────
export const CSV_COLUMNS = [
  "Project",
  "Plan",
  "Sheet",
  "Category",
  "Item Name",
  "Abbreviation",
  "Equipment Tag",
  "Size",
  "Material",
  "System",
  "Zone",
  "Level",
  "Phase",
  "Unit",
  "Net Quantity",
  "Waste %",
  "Gross Quantity",
  "Source Type",
  "Source ID",
  "Status",
  "Notes",
  "Created By",
  "Updated At",
] as const;

export type CsvRow = Record<typeof CSV_COLUMNS[number], string>;

// ─── Row builder ──────────────────────────────────────────────────────────────
export function buildCsvRow(
  item: TakeoffItem,
  catalog: Map<string, HvacCatalogItem>,
  context: {
    projectName?: string;
    planName?: string;
    systemName?: string;
    zoneName?: string;
    levelName?: string;
    phaseName?: string;
  } = {}
): CsvRow {
  const catalogItem = catalog.get(item.catalogItemId);

  let sourceId = "";
  switch (item.source.kind) {
    case "manual":
      sourceId = "";
      break;
    case "count-marker":
      sourceId = item.source.markupId;
      break;
    case "measurement":
      sourceId = item.source.measurementId;
      break;
    case "assembly":
      sourceId = item.source.assemblyApplicationId;
      break;
  }

  let sizeStr = "";
  if (item.size) {
    if (item.size.diameter != null) {
      sizeStr = `Ø${item.size.diameter}"`;
    } else if (item.size.width != null && item.size.height != null) {
      sizeStr = `${item.size.width}x${item.size.height}"`;
    } else if (item.size.width != null) {
      sizeStr = `${item.size.width}"`;
    }
  }

  return {
    "Project": context.projectName ?? "",
    "Plan": context.planName ?? item.planId,
    "Sheet": item.pageNumber != null ? String(item.pageNumber) : "",
    "Category": catalogItem?.category ?? "",
    "Item Name": catalogItem?.name ?? item.catalogItemId,
    "Abbreviation": catalogItem?.abbreviation ?? "",
    "Equipment Tag": item.equipmentTag ?? "",
    "Size": sizeStr,
    "Material": item.material ?? "",
    "System": context.systemName ?? item.systemId ?? "",
    "Zone": context.zoneName ?? item.zoneId ?? "",
    "Level": context.levelName ?? item.levelId ?? "",
    "Phase": context.phaseName ?? item.phaseId ?? "",
    "Unit": item.unit,
    "Net Quantity": item.netQuantity,
    "Waste %": item.wastePercent,
    "Gross Quantity": item.grossQuantity,
    "Source Type": item.source.kind,
    "Source ID": sourceId,
    "Status": item.status,
    "Notes": item.notes ?? "",
    "Created By": item.createdBy.name,
    "Updated At": item.updatedAt,
  };
}

// ─── CSV generation ────────────────────────────────────────────────────────────
export function rowsToCsv(rows: CsvRow[]): string {
  const header = CSV_COLUMNS.map(escapeCsvField).join(",");
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((col) => escapeCsvField(row[col])).join(",")
  );
  return [header, ...lines].join("\r\n");
}

export function takeoffItemsToCsv(
  items: TakeoffItem[],
  catalog: Map<string, HvacCatalogItem>,
  filter?: TakeoffFilter,
  context: Parameters<typeof buildCsvRow>[2] = {}
): string {
  let filtered = items;
  if (filter) {
    filtered = items.filter((item) => {
      if (filter.pageNumber != null && item.pageNumber !== filter.pageNumber) return false;
      if (filter.systemId && item.systemId !== filter.systemId) return false;
      if (filter.zoneId && item.zoneId !== filter.zoneId) return false;
      if (filter.levelId && item.levelId !== filter.levelId) return false;
      if (filter.phaseId && item.phaseId !== filter.phaseId) return false;
      if (filter.groupId && item.groupId !== filter.groupId) return false;
      if (filter.status && item.status !== filter.status) return false;
      if (filter.locked != null && item.locked !== filter.locked) return false;
      return true;
    });
  }

  const rows = filtered.map((item) => buildCsvRow(item, catalog, context));
  return rowsToCsv(rows);
}
