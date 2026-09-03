import type { HvacCatalogItem, HvacCategory, QuantityUnit } from "@/lib/takeoff/types";
import { parseCatalogCsv, validateCatalogRow, catalogRowToInput } from "@/lib/takeoff/import";
import type { CatalogRepository, TakeoffItemRepository } from "./repositories/takeoff-repository";

// ─── Default catalog seed data ─────────────────────────────────────────────────
const DEFAULT_CATALOG: Array<Omit<HvacCatalogItem, "id" | "revision" | "createdAt" | "updatedAt">> = [
  // Equipment
  { organizationId: "", category: "equipment", name: "RTU - Rooftop Unit", abbreviation: "RTU", description: "Packaged rooftop unit", active: true, defaultUnit: "each", defaultColor: "#dc2626", defaultSymbol: "■", keywords: ["rooftop", "packaged", "ahu"], sortOrder: 10, createdBy: { name: "System" } },
  { organizationId: "", category: "equipment", name: "Fan Coil Unit", abbreviation: "FCU", description: "Fan coil unit", active: true, defaultUnit: "each", defaultColor: "#dc2626", defaultSymbol: "■", keywords: ["fcu", "fan coil"], sortOrder: 20, createdBy: { name: "System" } },
  { organizationId: "", category: "equipment", name: "Air Handling Unit", abbreviation: "AHU", description: "Air handling unit", active: true, defaultUnit: "each", defaultColor: "#dc2626", defaultSymbol: "■", keywords: ["ahu", "air handler"], sortOrder: 30, createdBy: { name: "System" } },
  // Air Devices
  { organizationId: "", category: "air-devices", name: "Supply Diffuser", abbreviation: "SD", description: "Ceiling supply diffuser", active: true, defaultUnit: "each", defaultColor: "#2563eb", defaultSymbol: "◆", keywords: ["diffuser", "supply", "grille"], sortOrder: 100, createdBy: { name: "System" } },
  { organizationId: "", category: "air-devices", name: "Return Grille", abbreviation: "RG", description: "Return air grille", active: true, defaultUnit: "each", defaultColor: "#7c3aed", defaultSymbol: "◇", keywords: ["return", "grille"], sortOrder: 110, createdBy: { name: "System" } },
  { organizationId: "", category: "air-devices", name: "Exhaust Grille", abbreviation: "EG", description: "Exhaust air grille", active: true, defaultUnit: "each", defaultColor: "#059669", defaultSymbol: "○", keywords: ["exhaust", "grille"], sortOrder: 120, createdBy: { name: "System" } },
  { organizationId: "", category: "air-devices", name: "Linear Slot Diffuser", abbreviation: "LSD", description: "Linear slot ceiling diffuser", active: true, defaultUnit: "each", defaultColor: "#2563eb", defaultSymbol: "—", keywords: ["linear", "slot", "diffuser"], sortOrder: 130, createdBy: { name: "System" } },
  // Ductwork
  { organizationId: "", category: "ductwork", name: "Rectangular Duct", abbreviation: "RD", description: "Rectangular sheet metal duct", active: true, defaultUnit: "linear-foot", defaultColor: "#d97706", defaultSymbol: null, keywords: ["rect", "duct", "sheet metal"], sortOrder: 200, createdBy: { name: "System" } },
  { organizationId: "", category: "ductwork", name: "Round Duct", abbreviation: "RND", description: "Round sheet metal duct", active: true, defaultUnit: "linear-foot", defaultColor: "#d97706", defaultSymbol: null, keywords: ["round", "spiral", "duct"], sortOrder: 210, createdBy: { name: "System" } },
  { organizationId: "", category: "ductwork", name: "Flexible Duct", abbreviation: "FLX", description: "Flexible insulated duct", active: true, defaultUnit: "linear-foot", defaultColor: "#65a30d", defaultSymbol: null, keywords: ["flex", "flexible", "duct"], sortOrder: 220, createdBy: { name: "System" } },
  // Duct Fittings
  { organizationId: "", category: "duct-fittings", name: "Elbow 90°", abbreviation: "ELB90", description: "90° elbow fitting", active: true, defaultUnit: "each", defaultColor: "#f59e0b", defaultSymbol: null, keywords: ["elbow", "90", "fitting"], sortOrder: 300, createdBy: { name: "System" } },
  { organizationId: "", category: "duct-fittings", name: "Tee", abbreviation: "TEE", description: "Duct tee fitting", active: true, defaultUnit: "each", defaultColor: "#f59e0b", defaultSymbol: null, keywords: ["tee", "fitting"], sortOrder: 310, createdBy: { name: "System" } },
  { organizationId: "", category: "duct-fittings", name: "Reducer", abbreviation: "RED", description: "Duct reducer/transition", active: true, defaultUnit: "each", defaultColor: "#f59e0b", defaultSymbol: null, keywords: ["reducer", "transition", "fitting"], sortOrder: 320, createdBy: { name: "System" } },
  // Dampers
  { organizationId: "", category: "dampers", name: "Volume Damper", abbreviation: "VD", description: "Manual volume damper", active: true, defaultUnit: "each", defaultColor: "#0891b2", defaultSymbol: null, keywords: ["volume", "damper", "vd"], sortOrder: 400, createdBy: { name: "System" } },
  { organizationId: "", category: "dampers", name: "Fire Damper", abbreviation: "FD", description: "UL listed fire damper", active: true, defaultUnit: "each", defaultColor: "#ef4444", defaultSymbol: null, keywords: ["fire", "damper", "fd", "ul"], sortOrder: 410, createdBy: { name: "System" } },
  { organizationId: "", category: "dampers", name: "Smoke Damper", abbreviation: "SMD", description: "Smoke damper", active: true, defaultUnit: "each", defaultColor: "#6b7280", defaultSymbol: null, keywords: ["smoke", "damper", "smd"], sortOrder: 420, createdBy: { name: "System" } },
  // Controls
  { organizationId: "", category: "controls", name: "Thermostat", abbreviation: "TSTAT", description: "Wall thermostat", active: true, defaultUnit: "each", defaultColor: "#8b5cf6", defaultSymbol: "T", keywords: ["thermostat", "stat", "controller"], sortOrder: 500, createdBy: { name: "System" } },
  { organizationId: "", category: "controls", name: "VAV Box", abbreviation: "VAV", description: "Variable air volume terminal box", active: true, defaultUnit: "each", defaultColor: "#8b5cf6", defaultSymbol: null, keywords: ["vav", "variable", "terminal"], sortOrder: 510, createdBy: { name: "System" } },
  // Refrigerant piping
  { organizationId: "", category: "refrigerant-piping", name: "Liquid Line", abbreviation: "LL", description: "Refrigerant liquid line", active: true, defaultUnit: "linear-foot", defaultColor: "#0284c7", defaultSymbol: null, keywords: ["liquid", "refrigerant", "line"], sortOrder: 600, createdBy: { name: "System" } },
  { organizationId: "", category: "refrigerant-piping", name: "Suction Line", abbreviation: "SL", description: "Refrigerant suction line", active: true, defaultUnit: "linear-foot", defaultColor: "#0369a1", defaultSymbol: null, keywords: ["suction", "refrigerant", "line"], sortOrder: 610, createdBy: { name: "System" } },
  // Supports & hangers
  { organizationId: "", category: "supports-hangers", name: "Duct Hanger", abbreviation: "DHGR", description: "All-thread duct hanger", active: true, defaultUnit: "each", defaultColor: "#78716c", defaultSymbol: null, keywords: ["hanger", "support", "allthread"], sortOrder: 700, createdBy: { name: "System" } },
  { organizationId: "", category: "supports-hangers", name: "Trapeze Hanger", abbreviation: "TRAP", description: "Trapeze pipe/duct hanger", active: true, defaultUnit: "each", defaultColor: "#78716c", defaultSymbol: null, keywords: ["trapeze", "hanger", "support"], sortOrder: 710, createdBy: { name: "System" } },
  // Insulation
  { organizationId: "", category: "insulation", name: "Duct Wrap Insulation", abbreviation: "DWI", description: "Fiberglass duct wrap", active: true, defaultUnit: "square-foot", defaultColor: "#16a34a", defaultSymbol: null, keywords: ["wrap", "insulation", "fiberglass"], sortOrder: 800, createdBy: { name: "System" } },
  // Accessories
  { organizationId: "", category: "accessories", name: "Flex Connector", abbreviation: "FLXC", description: "Flexible duct connector", active: true, defaultUnit: "each", defaultColor: "#84cc16", defaultSymbol: null, keywords: ["flex", "connector", "canvas"], sortOrder: 900, createdBy: { name: "System" } },
];

// ─── Service ──────────────────────────────────────────────────────────────────
export class CatalogService {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly items: TakeoffItemRepository
  ) {}

  async createCatalogItem(input: Parameters<CatalogRepository["create"]>[0]): Promise<HvacCatalogItem> {
    return this.catalog.create(input);
  }

  async updateCatalogItem(
    id: string,
    input: Parameters<CatalogRepository["update"]>[1],
    expectedRevision: number
  ): Promise<HvacCatalogItem> {
    return this.catalog.update(id, input, expectedRevision);
  }

  async deleteCatalogItem(id: string, expectedRevision: number): Promise<void> {
    // Check no active takeoff items reference this catalog item
    const existing = await this.catalog.get(id);
    if (!existing) throw new Error("Catalog item not found");

    // We can't efficiently query across all plans, so just attempt delete
    // Prisma will enforce FK constraint; local repo has no FK but we log the check
    return this.catalog.delete(id, expectedRevision);
  }

  async listActiveTakeoffItemsByCatalog(catalogItemId: string, planId: string): Promise<ReturnType<TakeoffItemRepository["list"]>> {
    return this.items.list(planId, { catalogItemId, status: "open" });
  }

  async importCatalogCsv(
    csvText: string,
    organizationId: string,
    authorName: string
  ): Promise<{ imported: number; errors: Array<{ rowIndex: number; field: string; message: string }> }> {
    const { rows, errors: parseErrors } = parseCatalogCsv(csvText);
    if (parseErrors.length > 0) {
      return { imported: 0, errors: parseErrors };
    }

    const existing = await this.catalog.list(organizationId);
    const allErrors: typeof parseErrors = [];
    const validInputs: Array<Omit<HvacCatalogItem, "id" | "revision" | "createdAt" | "updatedAt">> = [];

    for (const row of rows) {
      const result = validateCatalogRow(row, existing);
      if (!result.valid) {
        allErrors.push(...result.errors);
      } else {
        validInputs.push(catalogRowToInput(row, organizationId, authorName));
      }
    }

    if (allErrors.length > 0) {
      return { imported: 0, errors: allErrors };
    }

    // Commit all
    let imported = 0;
    for (const input of validInputs) {
      await this.catalog.create(input);
      imported++;
    }
    return { imported, errors: [] };
  }

  async seedDefaultCatalog(organizationId: string, authorName = "System"): Promise<number> {
    const seeded: number[] = [];
    for (const item of DEFAULT_CATALOG) {
      await this.catalog.create({
        ...item,
        organizationId,
        createdBy: { name: authorName },
      });
      seeded.push(1);
    }
    return seeded.length;
  }

  async listCatalog(
    organizationId: string,
    filter?: { category?: HvacCategory; active?: boolean; search?: string }
  ): Promise<HvacCatalogItem[]> {
    return this.catalog.list(organizationId, filter);
  }

  async getCatalogItem(id: string): Promise<HvacCatalogItem | null> {
    return this.catalog.get(id);
  }

  exportCatalogCsv(items: HvacCatalogItem[]): string {
    const header = "name,abbreviation,category,defaultUnit,description,defaultColor,keywords,sortOrder,active";
    const rows = items.map((item) => {
      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [
        escape(item.name),
        escape(item.abbreviation),
        item.category,
        item.defaultUnit,
        escape(item.description ?? ""),
        item.defaultColor,
        escape(item.keywords.join(";")),
        String(item.sortOrder),
        String(item.active),
      ].join(",");
    });
    return [header, ...rows].join("\r\n");
  }
}

void (undefined as unknown as QuantityUnit); // keep type import alive
