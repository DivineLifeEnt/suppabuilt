import { describe, it, expect } from "vitest";
import { parseCatalogCsv, validateCatalogRow } from "@/lib/takeoff/import";
import type { HvacCatalogItem } from "@/lib/takeoff/types";

const VALID_CSV = `category,name,abbreviation,description,defaultUnit,keywords
equipment,Air Handler,AHU,"Large unit, rooftop",each,"ahu,air handler"
ductwork,Supply Duct,SD,,linear-foot,duct
`;

const NO_CATALOG: HvacCatalogItem[] = [];

describe("parseCatalogCsv", () => {
  it("parses valid CSV rows", () => {
    const result = parseCatalogCsv(VALID_CSV);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe("Air Handler");
    expect(result.rows[0].category).toBe("equipment");
  });
  it("handles quoted commas", () => {
    const result = parseCatalogCsv(VALID_CSV);
    expect(result.rows[0].description).toBe("Large unit, rooftop");
  });
  it("handles empty description", () => {
    const result = parseCatalogCsv(VALID_CSV);
    expect(result.rows[1].description).toBe("");
  });
  it("returns empty rows for empty input", () => {
    const result = parseCatalogCsv("");
    expect(result.rows).toHaveLength(0);
  });
  it("returns error for missing required headers", () => {
    const result = parseCatalogCsv("category,name\n");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateCatalogRow", () => {
  it("passes a valid row", () => {
    const result = parseCatalogCsv(VALID_CSV);
    const row = result.rows[0];
    const validation = validateCatalogRow(row, NO_CATALOG);
    expect(validation.valid).toBe(true);
  });
  it("fails with missing name", () => {
    const csv = "category,name,abbreviation,defaultUnit\nequipment,,RTU,each\n";
    const result = parseCatalogCsv(csv);
    expect(result.rows).toHaveLength(1);
    const validation = validateCatalogRow(result.rows[0], NO_CATALOG);
    expect(validation.valid).toBe(false);
  });
  it("fails with invalid category", () => {
    const csv = "category,name,abbreviation,defaultUnit\nbadcat,RTU,RTU,each\n";
    const result = parseCatalogCsv(csv);
    expect(result.rows).toHaveLength(1);
    const validation = validateCatalogRow(result.rows[0], NO_CATALOG);
    expect(validation.valid).toBe(false);
  });
  it("fails with invalid defaultUnit", () => {
    const csv = "category,name,abbreviation,defaultUnit\nequipment,RTU,RTU,badunit\n";
    const result = parseCatalogCsv(csv);
    expect(result.rows).toHaveLength(1);
    const validation = validateCatalogRow(result.rows[0], NO_CATALOG);
    expect(validation.valid).toBe(false);
  });
});
