import { describe, it, expect } from "vitest";
import { escapeCsvField, buildCsvRow, CSV_COLUMNS, rowsToCsv } from "@/lib/takeoff/csv-export";
import type { TakeoffItem, HvacCatalogItem } from "@/lib/takeoff/types";

function makeItem(overrides: Partial<TakeoffItem> = {}): TakeoffItem {
  return {
    id: "1", planId: "plan1", pageNumber: 1, catalogItemId: "cat1",
    source: { kind: "manual" }, unit: "each", netQuantity: "1",
    wastePercent: "0", grossQuantity: "1", equipmentTag: null, size: null,
    material: null, systemId: null, zoneId: null, levelId: null, phaseId: null,
    groupId: null, notes: null, customFields: {}, status: "open", locked: false,
    visible: true, revision: 1, createdBy: { name: "Test" },
    createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("escapeCsvField — formula injection protection", () => {
  it("prefixes = with quote", () => {
    expect(escapeCsvField("=SUM(A1)")).toBe("'=SUM(A1)");
  });
  it("prefixes + with quote", () => {
    expect(escapeCsvField("+1")).toBe("'+1");
  });
  it("prefixes @ with quote", () => {
    expect(escapeCsvField("@UPPER()")).toBe("'@UPPER()");
  });
  it("wraps commas in quotes", () => {
    expect(escapeCsvField("hello, world")).toBe('"hello, world"');
  });
  it("escapes internal double-quotes", () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });
  it("passes safe strings unchanged", () => {
    expect(escapeCsvField("HVAC Unit")).toBe("HVAC Unit");
  });
  it("handles null/undefined as empty", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });
});

describe("CSV_COLUMNS", () => {
  it("has required columns", () => {
    expect(CSV_COLUMNS).toContain("Item Name");
    expect(CSV_COLUMNS).toContain("Net Quantity");
    expect(CSV_COLUMNS).toContain("Gross Quantity");
    expect(CSV_COLUMNS).toContain("Unit");
  });
});

describe("buildCsvRow", () => {
  it("returns row with correct fields", () => {
    const item = makeItem();
    const catalog = new Map<string, HvacCatalogItem>();
    const row = buildCsvRow(item, catalog);
    expect(row["Net Quantity"]).toBe("1");
    expect(row["Unit"]).toBe("each");
    expect(row["Status"]).toBe("open");
  });
});

describe("rowsToCsv", () => {
  it("includes header row", () => {
    const item = makeItem();
    const catalog = new Map<string, HvacCatalogItem>();
    const row = buildCsvRow(item, catalog);
    const csv = rowsToCsv([row]);
    expect(csv).toContain("Item Name");
    expect(csv).toContain("Net Quantity");
  });
});
