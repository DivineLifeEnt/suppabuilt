import { describe, it, expect } from "vitest";
import { aggregateTakeoff } from "@/lib/takeoff/aggregation";
import type { TakeoffItem, HvacCatalogItem } from "@/lib/takeoff/types";

function makeItem(overrides: Partial<TakeoffItem>): TakeoffItem {
  return {
    id: "1", planId: "plan1", pageNumber: 1, catalogItemId: "cat1",
    source: { kind: "manual" }, unit: "each",
    netQuantity: "1", wastePercent: "0", grossQuantity: "1",
    equipmentTag: null, size: null, material: null,
    systemId: null, zoneId: null, levelId: null, phaseId: null, groupId: null,
    notes: null, customFields: {}, status: "open", locked: false, visible: true,
    revision: 1, createdBy: { name: "Test" },
    createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const catItem: HvacCatalogItem = {
  id: "cat1", organizationId: "org1", category: "equipment", name: "AHU",
  abbreviation: "AHU", description: null, active: true, defaultUnit: "each",
  defaultColor: "#ff6a1a", defaultSymbol: null, keywords: [], sortOrder: 0,
  revision: 1, createdBy: { name: "T" }, createdAt: "", updatedAt: "",
};

const catItem2: HvacCatalogItem = { ...catItem, id: "cat2", name: "Duct" };

describe("aggregateTakeoff", () => {
  it("sums items with same catalogItemId and unit", () => {
    const catalog = new Map([["cat1", catItem]]);
    const items = [
      makeItem({ id: "1", catalogItemId: "cat1", unit: "each", netQuantity: "2", grossQuantity: "2.1" }),
      makeItem({ id: "2", catalogItemId: "cat1", unit: "each", netQuantity: "3", grossQuantity: "3.15" }),
    ];
    const rows = aggregateTakeoff(items, catalog);
    expect(rows).toHaveLength(1);
    expect(parseFloat(rows[0].totalNet)).toBeCloseTo(5, 4);
    expect(parseFloat(rows[0].totalGross)).toBeCloseTo(5.25, 2);
    expect(rows[0].count).toBe(2);
  });

  it("separates different units for same catalog item", () => {
    const catalog = new Map([["cat1", catItem]]);
    const items = [
      makeItem({ id: "1", catalogItemId: "cat1", unit: "each", netQuantity: "1", grossQuantity: "1" }),
      makeItem({ id: "2", catalogItemId: "cat1", unit: "linear-foot", netQuantity: "10", grossQuantity: "10" }),
    ];
    const rows = aggregateTakeoff(items, catalog);
    expect(rows.length).toBe(2);
  });

  it("skips items not in catalog", () => {
    const catalog = new Map([["cat2", catItem2]]);
    const items = [makeItem({ catalogItemId: "cat1" })]; // cat1 not in map
    const rows = aggregateTakeoff(items, catalog);
    expect(rows).toHaveLength(0);
  });

  it("skips invisible items", () => {
    const catalog = new Map([["cat1", catItem]]);
    const items = [makeItem({ visible: false })];
    const rows = aggregateTakeoff(items, catalog);
    expect(rows).toHaveLength(0);
  });

  it("returns empty for no items", () => {
    expect(aggregateTakeoff([], new Map())).toHaveLength(0);
  });
});
