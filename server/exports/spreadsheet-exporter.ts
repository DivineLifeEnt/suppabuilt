/**
 * XLSX export for takeoff and estimate data.
 * Uses the xlsx package (already installed in Sprint 4).
 * Formula injection protection via lib/exports/spreadsheet-safety.ts.
 */
import * as XLSX from "xlsx";
import { escapeCellValue } from "@/lib/exports/spreadsheet-safety";
import type { VersionTotals } from "@/server/estimating/calculation-service";
import { formatMoney } from "@/lib/estimating/money";

// Row type for XLSX worksheet
type XlsxRow = Array<string | number | boolean>;

function safeRow(values: unknown[]): XlsxRow {
  return values.map(escapeCellValue);
}

export async function exportTakeoffXlsx(
  items: Array<{
    id: string; catalogItemId: string; unit: string; grossQuantity: string;
    netQuantity: string; wastePercent: string; notes: string | null;
    catalogItem?: { name: string; category: string; abbreviation: string };
  }>,
  groups: Array<{ id: string; name: string }>
): Promise<Buffer> {
  const wb = XLSX.utils.book_new();

  // Header row
  const headers = [
    "ID", "Category", "Item Name", "Abbreviation", "Unit",
    "Net Qty", "Waste %", "Gross Qty", "Notes",
  ];

  const rows: XlsxRow[] = [safeRow(headers)];
  for (const item of items) {
    rows.push(safeRow([
      item.id,
      item.catalogItem?.category ?? "",
      item.catalogItem?.name ?? item.catalogItemId,
      item.catalogItem?.abbreviation ?? "",
      item.unit,
      item.netQuantity,
      item.wastePercent,
      item.grossQuantity,
      item.notes ?? "",
    ]));
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, "Takeoff");

  // Groups sheet
  const groupHeaders = ["Group ID", "Group Name"];
  const groupRows: XlsxRow[] = [safeRow(groupHeaders)];
  for (const g of groups) groupRows.push(safeRow([g.id, g.name]));
  const gsWs = XLSX.utils.aoa_to_sheet(groupRows);
  XLSX.utils.book_append_sheet(wb, gsWs, "Groups");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buf;
}

export async function exportEstimateXlsx(
  version: { id: string; versionNumber: number; currency: string; status: string },
  lines: Array<{
    id: string; description: string; category: string; quantity: string; unit: string;
    unitMaterialCost: string; laborHoursPerUnit: string; burdenedLaborRate: string;
    unitEquipmentCost: string; unitSubcontractCost: string; unitOtherCost: string;
    wastePercent: string; notes: string | null; included: boolean;
  }>,
  totals: VersionTotals,
  includeInternal: boolean
): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  const curr = version.currency;

  // ── Summary sheet ──────────────────────────────────────────────────────────
  const summaryRows: XlsxRow[] = [
    safeRow(["Estimate Summary"]),
    safeRow(["Version", version.versionNumber]),
    safeRow(["Status", version.status]),
    safeRow(["Currency", curr]),
    safeRow([]),
    safeRow(["Category", "Amount"]),
    safeRow(["Material Cost", formatMoney(totals.materialCost)]),
    safeRow(["Labor Cost", formatMoney(totals.laborCost)]),
    safeRow(["Equipment Cost", formatMoney(totals.equipmentCost)]),
    safeRow(["Subcontract Cost", formatMoney(totals.subcontractCost)]),
    safeRow(["Other Direct Cost", formatMoney(totals.otherDirectCost)]),
    safeRow(["Total Direct Cost", formatMoney(totals.totalDirectCost)]),
    safeRow([]),
  ];

  for (const adj of totals.adjustments) {
    summaryRows.push(safeRow([adj.label, formatMoney(adj.amount)]));
  }
  summaryRows.push(safeRow(["Base Total", formatMoney(totals.baseTotal)]));
  for (const tax of totals.taxes) {
    summaryRows.push(safeRow([tax.label, formatMoney(tax.amount)]));
  }
  summaryRows.push(safeRow(["Final Total", formatMoney(totals.finalTotal)]));

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // ── Detail sheet ───────────────────────────────────────────────────────────
  const detailHeaders: string[] = [
    "Description", "Category", "Qty", "Unit", "Waste %",
    "Included",
  ];
  if (includeInternal) {
    detailHeaders.push(
      "Unit Material Cost", "Labor Hrs/Unit", "Burdened Rate",
      "Unit Equip Cost", "Unit Sub Cost", "Unit Other Cost"
    );
  }
  detailHeaders.push("Notes");

  const detailRows: XlsxRow[] = [safeRow(detailHeaders)];
  for (const line of lines) {
    const base: unknown[] = [
      line.description, line.category,
      parseFloat(line.quantity) || line.quantity,
      line.unit,
      parseFloat(line.wastePercent) || line.wastePercent,
      line.included,
    ];
    if (includeInternal) {
      base.push(
        parseFloat(line.unitMaterialCost) || line.unitMaterialCost,
        parseFloat(line.laborHoursPerUnit) || line.laborHoursPerUnit,
        parseFloat(line.burdenedLaborRate) || line.burdenedLaborRate,
        parseFloat(line.unitEquipmentCost) || line.unitEquipmentCost,
        parseFloat(line.unitSubcontractCost) || line.unitSubcontractCost,
        parseFloat(line.unitOtherCost) || line.unitOtherCost,
      );
    }
    base.push(line.notes ?? "");
    detailRows.push(safeRow(base));
  }

  const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
  detailWs["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, detailWs, "Detail");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function exportMarkupCsv(
  markups: Array<{ id: string; label: string | null; type: string; status: string }>,
  _planId: string
): Promise<string> {
  const { escapeCsvField } = await import("@/lib/takeoff/csv-export");
  const header = ["ID", "Label", "Type", "Status"].map(escapeCsvField).join(",");
  const rows = markups.map((m) =>
    [m.id, m.label ?? "", m.type, m.status].map(escapeCsvField).join(",")
  );
  return [header, ...rows].join("\r\n");
}

export async function exportMeasurementCsv(
  measurements: Array<{ id: string; label: string | null; type: string; value: number; unit: string }>
): Promise<string> {
  const { escapeCsvField } = await import("@/lib/takeoff/csv-export");
  const header = ["ID", "Label", "Type", "Value", "Unit"].map(escapeCsvField).join(",");
  const rows = measurements.map((m) =>
    [m.id, m.label ?? "", m.type, String(m.value), m.unit].map(escapeCsvField).join(",")
  );
  return [header, ...rows].join("\r\n");
}
