import type {
  TakeoffItem,
  TakeoffSource,
  QuantityUnit,
  CreateTakeoffInput,
  UpdateTakeoffInput,
  TakeoffBatchInput,
  TakeoffBatchResult,
  TakeoffFilter,
} from "@/lib/takeoff/types";
import { calculateGrossQuantity } from "@/lib/takeoff/decimal";
import { mmToQuantityUnit, mm2ToQuantityUnit, isLinearUnit, isAreaUnit } from "@/lib/takeoff/units";
import type { TakeoffItemRepository, CatalogRepository } from "./repositories/takeoff-repository";

// ─── Service ──────────────────────────────────────────────────────────────────
export class TakeoffService {
  constructor(
    private readonly items: TakeoffItemRepository,
    private readonly catalog: CatalogRepository
  ) {}

  async createTakeoffItem(input: CreateTakeoffInput): Promise<TakeoffItem> {
    // Validate catalog item exists
    const catalogItem = await this.catalog.get(input.catalogItemId);
    if (!catalogItem) throw new Error(`Catalog item not found: ${input.catalogItemId}`);

    return this.items.create(input);
  }

  async updateTakeoffItem(
    id: string,
    input: UpdateTakeoffInput,
    expectedRevision: number
  ): Promise<TakeoffItem> {
    const existing = await this.items.get(id);
    if (!existing) throw new Error(`Takeoff item not found: ${id}`);
    if (existing.locked && input.locked !== false) {
      throw new Error(`Takeoff item ${id} is locked`);
    }
    return this.items.update(id, input, expectedRevision);
  }

  async deleteTakeoffItem(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.items.get(id);
    if (!existing) throw new Error(`Takeoff item not found: ${id}`);
    if (existing.locked) throw new Error(`Takeoff item ${id} is locked — unlock before deleting`);
    return this.items.delete(id, expectedRevision);
  }

  async listTakeoffItems(planId: string, filter?: TakeoffFilter): Promise<TakeoffItem[]> {
    return this.items.list(planId, filter);
  }

  async getTakeoffItem(id: string): Promise<TakeoffItem | null> {
    return this.items.get(id);
  }

  async batchTakeoffItems(planId: string, input: TakeoffBatchInput): Promise<TakeoffBatchResult> {
    return this.items.batch(planId, input);
  }

  /**
   * Convert a measurement to a takeoff item.
   * measurementData: { id, valueMm, valueMm2, type } from the measurement layer.
   */
  async convertMeasurementToTakeoff(
    measurementId: string,
    catalogItemId: string,
    unit: QuantityUnit,
    planId: string,
    pageNumber: number,
    authorName: string,
    measurementValue: { valueMm?: number; valueMm2?: number; type: "linear" | "area" | "count" }
  ): Promise<TakeoffItem> {
    const catalogItem = await this.catalog.get(catalogItemId);
    if (!catalogItem) throw new Error(`Catalog item not found: ${catalogItemId}`);

    let netQuantity: string;
    if (measurementValue.type === "linear" && measurementValue.valueMm != null && isLinearUnit(unit)) {
      netQuantity = mmToQuantityUnit(measurementValue.valueMm, unit);
    } else if (measurementValue.type === "area" && measurementValue.valueMm2 != null && isAreaUnit(unit)) {
      netQuantity = mm2ToQuantityUnit(measurementValue.valueMm2, unit);
    } else if (measurementValue.type === "count") {
      netQuantity = String(measurementValue.valueMm ?? 1);
    } else {
      throw new Error(`Cannot convert measurement type "${measurementValue.type}" to unit "${unit}"`);
    }

    const source: TakeoffSource = { kind: "measurement", measurementId };

    return this.items.create({
      planId,
      pageNumber,
      catalogItemId,
      source,
      unit,
      netQuantity,
      wastePercent: "0",
      equipmentTag: null,
      size: null,
      material: null,
      systemId: null,
      zoneId: null,
      levelId: null,
      phaseId: null,
      groupId: null,
      notes: null,
      customFields: {},
      status: "open",
      locked: false,
      visible: true,
      createdBy: { name: authorName },
    });
  }

  /**
   * Recalculate all takeoff items linked to a measurement.
   * Returns the updated items.
   */
  async recalculateLinkedItems(
    measurementId: string,
    newValueMm: number,
    newValueMm2?: number
  ): Promise<TakeoffItem[]> {
    const linked = await this.items.listBySourceMeasurement(measurementId);
    const updated: TakeoffItem[] = [];

    for (const item of linked) {
      let newNet = item.netQuantity;
      if (isLinearUnit(item.unit) && newValueMm != null) {
        newNet = mmToQuantityUnit(newValueMm, item.unit);
      } else if (isAreaUnit(item.unit) && newValueMm2 != null) {
        newNet = mm2ToQuantityUnit(newValueMm2, item.unit);
      }
      const result = await this.items.update(
        item.id,
        { netQuantity: newNet },
        item.revision
      );
      updated.push(result);
    }

    return updated;
  }

  /**
   * Return list of affected items when source is deleted (never auto-delete).
   */
  async handleSourceDeletion(
    source: { kind: "measurement"; id: string } | { kind: "markup"; id: string }
  ): Promise<TakeoffItem[]> {
    if (source.kind === "measurement") {
      return this.items.listBySourceMeasurement(source.id);
    } else {
      return this.items.listBySourceMarkup(source.id);
    }
  }

  /**
   * Detach item from its source — set source to manual, add audit note.
   */
  async detachItem(id: string, reason: string): Promise<TakeoffItem> {
    const existing = await this.items.get(id);
    if (!existing) throw new Error(`Takeoff item not found: ${id}`);

    const detachNote = `[Detached from ${existing.source.kind} source] ${reason}`.trim();
    const existingNotes = existing.notes ?? "";
    const notes = existingNotes ? `${existingNotes}\n${detachNote}` : detachNote;

    return this.items.update(
      id,
      {
        source: { kind: "manual" },
        notes,
      },
      existing.revision
    );
  }
}
