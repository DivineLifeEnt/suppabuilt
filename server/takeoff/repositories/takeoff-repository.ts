import type {
  HvacCatalogItem,
  TakeoffItem,
  TakeoffAssembly,
  ProjectSystem,
  ProjectZone,
  ProjectLevel,
  ProjectPhase,
  TakeoffGroup,
  HvacCategory,
  TakeoffFilter,
  CreateCatalogInput,
  UpdateCatalogInput,
  CreateTakeoffInput,
  UpdateTakeoffInput,
  CreateAssemblyInput,
  UpdateAssemblyInput,
  TakeoffBatchInput,
  TakeoffBatchResult,
} from "@/lib/takeoff/types";

// ─── Re-export error types from markup-repository ─────────────────────────────
export { ConflictError, NotFoundError } from "@/server/markup/repositories/markup-repository";

// ─── Catalog ──────────────────────────────────────────────────────────────────
export interface CatalogRepository {
  list(
    organizationId: string,
    filter?: { category?: HvacCategory; active?: boolean; search?: string }
  ): Promise<HvacCatalogItem[]>;
  get(id: string): Promise<HvacCatalogItem | null>;
  create(input: CreateCatalogInput): Promise<HvacCatalogItem>;
  update(id: string, input: UpdateCatalogInput, expectedRevision: number): Promise<HvacCatalogItem>;
  delete(id: string, expectedRevision: number): Promise<void>;
}

// ─── Takeoff Items ────────────────────────────────────────────────────────────
export interface TakeoffItemRepository {
  list(planId: string, filter?: TakeoffFilter): Promise<TakeoffItem[]>;
  get(id: string): Promise<TakeoffItem | null>;
  create(input: CreateTakeoffInput): Promise<TakeoffItem>;
  update(id: string, input: UpdateTakeoffInput, expectedRevision: number): Promise<TakeoffItem>;
  delete(id: string, expectedRevision: number): Promise<void>;
  batch(planId: string, input: TakeoffBatchInput): Promise<TakeoffBatchResult>;
  listBySourceMeasurement(measurementId: string): Promise<TakeoffItem[]>;
  listBySourceMarkup(markupId: string): Promise<TakeoffItem[]>;
}

// ─── Assemblies ───────────────────────────────────────────────────────────────
export interface AssemblyRepository {
  list(organizationId: string): Promise<TakeoffAssembly[]>;
  get(id: string): Promise<TakeoffAssembly | null>;
  create(input: CreateAssemblyInput): Promise<TakeoffAssembly>;
  update(id: string, input: UpdateAssemblyInput, expectedRevision: number): Promise<TakeoffAssembly>;
  delete(id: string, expectedRevision: number): Promise<void>;
}

// ─── Classifications ──────────────────────────────────────────────────────────
export interface ProjectSystemRepository {
  list(planId: string): Promise<ProjectSystem[]>;
  get(id: string): Promise<ProjectSystem | null>;
  create(input: Omit<ProjectSystem, "id" | "createdAt" | "updatedAt">): Promise<ProjectSystem>;
  update(id: string, input: Partial<Pick<ProjectSystem, "name" | "color">>): Promise<ProjectSystem>;
  delete(id: string): Promise<void>;
}

export interface ProjectZoneRepository {
  list(planId: string): Promise<ProjectZone[]>;
  get(id: string): Promise<ProjectZone | null>;
  create(input: Omit<ProjectZone, "id" | "createdAt" | "updatedAt">): Promise<ProjectZone>;
  update(id: string, input: Partial<Pick<ProjectZone, "name">>): Promise<ProjectZone>;
  delete(id: string): Promise<void>;
}

export interface ProjectLevelRepository {
  list(planId: string): Promise<ProjectLevel[]>;
  get(id: string): Promise<ProjectLevel | null>;
  create(input: Omit<ProjectLevel, "id" | "createdAt" | "updatedAt">): Promise<ProjectLevel>;
  update(id: string, input: Partial<Pick<ProjectLevel, "name" | "elevation">>): Promise<ProjectLevel>;
  delete(id: string): Promise<void>;
}

export interface ProjectPhaseRepository {
  list(planId: string): Promise<ProjectPhase[]>;
  get(id: string): Promise<ProjectPhase | null>;
  create(input: Omit<ProjectPhase, "id" | "createdAt" | "updatedAt">): Promise<ProjectPhase>;
  update(id: string, input: Partial<Pick<ProjectPhase, "name" | "sortOrder">>): Promise<ProjectPhase>;
  delete(id: string): Promise<void>;
}

export interface TakeoffGroupRepository {
  list(planId: string): Promise<TakeoffGroup[]>;
  get(id: string): Promise<TakeoffGroup | null>;
  create(input: Omit<TakeoffGroup, "id" | "createdAt" | "updatedAt">): Promise<TakeoffGroup>;
  update(id: string, input: Partial<Pick<TakeoffGroup, "name" | "color">>): Promise<TakeoffGroup>;
  delete(id: string): Promise<void>;
}
