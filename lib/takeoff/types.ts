import type { NormalizedPoint } from "@/lib/markup/types";

export type QuantityUnit =
  | "each"
  | "linear-foot"
  | "linear-inch"
  | "linear-meter"
  | "square-foot"
  | "square-meter"
  | "cubic-foot"
  | "cubic-meter"
  | "pound"
  | "kilogram"
  | "gallon"
  | "liter"
  | "hour";

export type TakeoffSource =
  | { kind: "manual" }
  | { kind: "count-marker"; markupId: string; point: NormalizedPoint }
  | { kind: "measurement"; measurementId: string }
  | { kind: "assembly"; assemblyApplicationId: string; parentTakeoffItemId: string };

export type HvacCategory =
  | "equipment"
  | "air-devices"
  | "ductwork"
  | "duct-fittings"
  | "dampers"
  | "controls"
  | "refrigerant-piping"
  | "hydronic-piping"
  | "condensate-drains"
  | "insulation"
  | "supports-hangers"
  | "accessories"
  | "other";

export type TakeoffAuthor = { name: string };

export type HvacCatalogItem = {
  id: string;
  organizationId: string;
  category: HvacCategory;
  name: string;
  abbreviation: string;
  description: string | null;
  active: boolean;
  defaultUnit: QuantityUnit;
  defaultColor: string;
  defaultSymbol: string | null;
  keywords: string[];
  sortOrder: number;
  revision: number;
  createdBy: TakeoffAuthor;
  createdAt: string;
  updatedAt: string;
};

export type TakeoffSize = {
  width?: number;   // inches
  height?: number;  // inches (rect duct)
  diameter?: number; // inches (round)
  unit: "inch" | "mm";
};

export type AssemblyRuleKind =
  | "fixed"
  | "multiply-by-source-count"
  | "multiply-length-by-factor"
  | "multiply-area-by-factor"
  | "ceiling-length-divided-by-spacing"
  | "conditional";

export type AssemblyRule =
  | { kind: "fixed"; quantity: string }
  | { kind: "multiply-by-source-count"; factor: string }
  | { kind: "multiply-length-by-factor"; factor: string }
  | { kind: "multiply-area-by-factor"; factor: string }
  | { kind: "ceiling-length-divided-by-spacing"; spacingFeet: string }
  | { kind: "conditional"; field: string; equals: string; thenQuantity: string; elseQuantity: string };

export type AssemblyComponent = {
  id: string;
  assemblyId: string;
  catalogItemId: string;
  unit: QuantityUnit;
  rule: AssemblyRule;
  wastePercent: string;
  sortOrder: number;
};

export type TakeoffAssembly = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  active: boolean;
  triggerCatalogItemId: string;
  components: AssemblyComponent[];
  revision: number;
  createdBy: TakeoffAuthor;
  createdAt: string;
  updatedAt: string;
};

export type TakeoffItem = {
  id: string;
  planId: string;
  pageNumber: number | null;
  catalogItemId: string;
  source: TakeoffSource;
  unit: QuantityUnit;
  netQuantity: string;    // decimal string
  wastePercent: string;   // decimal string
  grossQuantity: string;  // decimal string
  equipmentTag: string | null;
  size: TakeoffSize | null;
  material: string | null;
  systemId: string | null;
  zoneId: string | null;
  levelId: string | null;
  phaseId: string | null;
  groupId: string | null;
  notes: string | null;
  customFields: Record<string, unknown>;
  status: "open" | "resolved";
  locked: boolean;
  visible: boolean;
  revision: number;
  createdBy: TakeoffAuthor;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSystem = {
  id: string;
  planId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectZone = {
  id: string;
  planId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectLevel = {
  id: string;
  planId: string;
  name: string;
  elevation: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectPhase = {
  id: string;
  planId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TakeoffGroup = {
  id: string;
  planId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Filter ───────────────────────────────────────────────────────────────────
export type TakeoffFilter = {
  pageNumber?: number;
  catalogItemId?: string;
  systemId?: string;
  zoneId?: string;
  levelId?: string;
  phaseId?: string;
  groupId?: string;
  status?: "open" | "resolved";
  locked?: boolean;
};

// ─── Input types ──────────────────────────────────────────────────────────────
export type CreateCatalogInput = Omit<HvacCatalogItem, "id" | "revision" | "createdAt" | "updatedAt">;
export type UpdateCatalogInput = Partial<Omit<HvacCatalogItem, "id" | "organizationId" | "revision" | "createdAt" | "updatedAt" | "createdBy">>;

export type CreateTakeoffInput = Omit<TakeoffItem, "id" | "revision" | "createdAt" | "updatedAt" | "grossQuantity">;
export type UpdateTakeoffInput = Partial<Omit<TakeoffItem, "id" | "planId" | "revision" | "createdAt" | "updatedAt" | "createdBy" | "grossQuantity">>;

export type AssemblyComponentInput = Omit<AssemblyComponent, "id" | "assemblyId">;

export type CreateAssemblyInput = Omit<TakeoffAssembly, "id" | "revision" | "createdAt" | "updatedAt" | "components"> & {
  components: AssemblyComponentInput[];
};
export type UpdateAssemblyInput = Partial<Omit<TakeoffAssembly, "id" | "organizationId" | "revision" | "createdAt" | "updatedAt" | "createdBy" | "components"> & {
  components: AssemblyComponentInput[];
}>;

export type TakeoffBatchItem =
  | { op: "create"; input: CreateTakeoffInput }
  | { op: "update"; id: string; input: UpdateTakeoffInput; expectedRevision: number }
  | { op: "delete"; id: string; expectedRevision: number };

export type TakeoffBatchInput = { items: TakeoffBatchItem[] };

export type TakeoffBatchResultItem =
  | { op: "create"; item: TakeoffItem }
  | { op: "update"; item: TakeoffItem }
  | { op: "delete"; id: string }
  | { op: "error"; index: number; code: string; message: string };

export type TakeoffBatchResult = { results: TakeoffBatchResultItem[] };

// ─── Command type for undo/redo ───────────────────────────────────────────────
export type TakeoffCommand =
  | { type: "AddItem"; item: TakeoffItem }
  | { type: "DeleteItem"; item: TakeoffItem }
  | { type: "UpdateItem"; before: TakeoffItem; after: TakeoffItem }
  | { type: "BatchAdd"; items: TakeoffItem[] };
