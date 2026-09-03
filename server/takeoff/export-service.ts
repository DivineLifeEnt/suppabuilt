import type { TakeoffFilter, HvacCatalogItem } from "@/lib/takeoff/types";
import { takeoffItemsToCsv } from "@/lib/takeoff/csv-export";
import { exportTakeoffXlsx } from "@/lib/takeoff/xlsx-export";
import type { TakeoffItemRepository, CatalogRepository } from "./repositories/takeoff-repository";

export class ExportService {
  constructor(
    private readonly items: TakeoffItemRepository,
    private readonly catalog: CatalogRepository
  ) {}

  private async buildCatalogMap(organizationId: string): Promise<Map<string, HvacCatalogItem>> {
    const catalogItems = await this.catalog.list(organizationId);
    return new Map(catalogItems.map((c) => [c.id, c]));
  }

  async exportTakeoffCsv(
    planId: string,
    organizationId: string,
    filter?: TakeoffFilter,
    context: { projectName?: string; planName?: string } = {}
  ): Promise<string> {
    const items = await this.items.list(planId, filter);
    const catalogMap = await this.buildCatalogMap(organizationId);
    return takeoffItemsToCsv(items, catalogMap, filter, context);
  }

  async exportTakeoffXlsx(
    planId: string,
    organizationId: string,
    filter?: TakeoffFilter,
    context: { projectName?: string; planName?: string } = {}
  ): Promise<Buffer> {
    const items = await this.items.list(planId, filter);
    const catalogMap = await this.buildCatalogMap(organizationId);
    return exportTakeoffXlsx(items, catalogMap, filter, context);
  }
}
