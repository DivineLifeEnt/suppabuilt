import type { TakeoffItem, HvacCatalogItem, HvacCategory, QuantityUnit } from "./types";
import { addDecimal } from "./decimal";

export type TakeoffTotal = {
  catalogItemId: string;
  category: HvacCategory;
  name: string;
  unit: QuantityUnit;
  totalNet: string;   // sum of netQuantity
  totalGross: string; // sum of grossQuantity
  count: number;      // number of items
};

type AggKey = `${string}::${string}`; // catalogItemId::unit

function makeKey(catalogItemId: string, unit: QuantityUnit): AggKey {
  return `${catalogItemId}::${unit}` as AggKey;
}

/**
 * Aggregate visible takeoff items into totals by catalogItemId+unit.
 */
export function aggregateTakeoff(
  items: TakeoffItem[],
  catalog: Map<string, HvacCatalogItem>
): TakeoffTotal[] {
  return _aggregate(items, catalog);
}

/**
 * Aggregate a filtered subset.
 */
export function aggregateFiltered(
  items: TakeoffItem[],
  catalog: Map<string, HvacCatalogItem>,
  filter: {
    systemId?: string;
    zoneId?: string;
    levelId?: string;
    groupId?: string;
  }
): TakeoffTotal[] {
  const filtered = items.filter((item) => {
    if (filter.systemId && item.systemId !== filter.systemId) return false;
    if (filter.zoneId && item.zoneId !== filter.zoneId) return false;
    if (filter.levelId && item.levelId !== filter.levelId) return false;
    if (filter.groupId && item.groupId !== filter.groupId) return false;
    return true;
  });
  return _aggregate(filtered, catalog);
}

function _aggregate(
  items: TakeoffItem[],
  catalog: Map<string, HvacCatalogItem>
): TakeoffTotal[] {
  const totalsMap = new Map<AggKey, TakeoffTotal>();

  for (const item of items) {
    if (!item.visible) continue;

    const catalogItem = catalog.get(item.catalogItemId);
    if (!catalogItem) continue;

    const key = makeKey(item.catalogItemId, item.unit);
    const existing = totalsMap.get(key);

    if (existing) {
      existing.totalNet = addDecimal(existing.totalNet, item.netQuantity);
      existing.totalGross = addDecimal(existing.totalGross, item.grossQuantity);
      existing.count += 1;
    } else {
      totalsMap.set(key, {
        catalogItemId: item.catalogItemId,
        category: catalogItem.category,
        name: catalogItem.name,
        unit: item.unit,
        totalNet: item.netQuantity,
        totalGross: item.grossQuantity,
        count: 1,
      });
    }
  }

  // Sort by category, then name
  return Array.from(totalsMap.values()).sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    if (catCmp !== 0) return catCmp;
    return a.name.localeCompare(b.name);
  });
}
