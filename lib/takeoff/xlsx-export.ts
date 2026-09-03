import * as XLSX from "xlsx";
import type { TakeoffItem, HvacCatalogItem, TakeoffFilter } from "./types";
import { aggregateTakeoff } from "./aggregation";
import { buildCsvRow, CSV_COLUMNS, escapeCsvField } from "./csv-export";

// ─── Summary sheet ─────────────────────────────────────────────────────────────
const SUMMARY_COLUMNS = [
  "Category",
  "Item Name",
  "Unit",
  "Net Total",
  "Waste %",
  "Gross Total",
  "Count",
] as const;

// ─── XLSX export ──────────────────────────────────────────────────────────────
export function exportTakeoffXlsx(
  items: TakeoffItem[],
  catalog: Map<string, HvacCatalogItem>,
  filter?: TakeoffFilter,
  context: Parameters<typeof buildCsvRow>[2] = {}
): Buffer {
  const wb = XLSX.utils.book_new();

  // ── Summary sheet ──────────────────────────────────────────────────────────
  let filteredItems = items;
  if (filter) {
    filteredItems = items.filter((item) => {
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

  const totals = aggregateTakeoff(filteredItems, catalog);

  const summaryData: unknown[][] = [
    [...SUMMARY_COLUMNS],
    ...totals.map((t) => [
      escapeCsvField(t.category),
      escapeCsvField(t.name),
      escapeCsvField(t.unit),
      parseFloat(t.totalNet) || 0,
      0,   // waste % — aggregate-level n/a
      parseFloat(t.totalGross) || 0,
      t.count,
    ]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Freeze header row
  summarySheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  // Column widths
  summarySheet["!cols"] = [
    { wch: 20 }, // Category
    { wch: 35 }, // Item Name
    { wch: 14 }, // Unit
    { wch: 14 }, // Net Total
    { wch: 10 }, // Waste %
    { wch: 14 }, // Gross Total
    { wch: 8 },  // Count
  ];

  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // ── Detail sheet ───────────────────────────────────────────────────────────
  const detailRows = filteredItems.map((item) => buildCsvRow(item, catalog, context));

  const detailData: unknown[][] = [
    [...CSV_COLUMNS],
    ...detailRows.map((row) =>
      CSV_COLUMNS.map((col) => {
        const val = row[col];
        // Use numeric cells for quantity columns
        if (
          col === "Net Quantity" ||
          col === "Gross Quantity" ||
          col === "Waste %"
        ) {
          const num = parseFloat(val);
          return isNaN(num) ? escapeCsvField(val) : num;
        }
        return escapeCsvField(val);
      })
    ),
  ];

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);

  // Freeze header row
  detailSheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Column widths
  detailSheet["!cols"] = CSV_COLUMNS.map((col) => {
    switch (col) {
      case "Item Name": return { wch: 35 };
      case "Notes": return { wch: 40 };
      case "Source ID": return { wch: 30 };
      case "Updated At": return { wch: 22 };
      default: return { wch: 16 };
    }
  });

  XLSX.utils.book_append_sheet(wb, detailSheet, "Detail");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buf;
}
