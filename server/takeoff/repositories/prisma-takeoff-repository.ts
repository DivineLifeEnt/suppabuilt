// Duck-typed Prisma client — full implementation for all takeoff interfaces.
// Uses string JSON columns for complex types (source, size, customFields, rule).

import type {
  HvacCatalogItem,
  TakeoffItem,
  TakeoffAssembly,
  AssemblyComponent,
  ProjectSystem,
  ProjectZone,
  ProjectLevel,
  ProjectPhase,
  TakeoffGroup,
  HvacCategory,
  TakeoffFilter,
  TakeoffSource,
  TakeoffSize,
  AssemblyRule,
  CreateCatalogInput,
  UpdateCatalogInput,
  CreateTakeoffInput,
  UpdateTakeoffInput,
  CreateAssemblyInput,
  UpdateAssemblyInput,
  TakeoffBatchInput,
  TakeoffBatchResult,
  TakeoffBatchResultItem,
} from "@/lib/takeoff/types";
import { calculateGrossQuantity } from "@/lib/takeoff/decimal";
import {
  type CatalogRepository,
  type TakeoffItemRepository,
  type AssemblyRepository,
  type ProjectSystemRepository,
  type ProjectZoneRepository,
  type ProjectLevelRepository,
  type ProjectPhaseRepository,
  type TakeoffGroupRepository,
  ConflictError,
  NotFoundError,
} from "./takeoff-repository";

// Duck-typed Prisma interfaces (avoid importing @prisma/client at type level)
type PrismaLike = {
  hvacCatalogItem: PrismaCatalogDelegate;
  takeoffItem: PrismaTakeoffDelegate;
  takeoffAssembly: PrismaAssemblyDelegate;
  assemblyComponent: PrismaComponentDelegate;
  projectSystem: PrismaClassDelegate;
  projectZone: PrismaClassDelegate;
  projectLevel: PrismaClassDelegate;
  projectPhase: PrismaClassDelegate;
  takeoffGroup: PrismaClassDelegate;
  $transaction: <T>(fn: (tx: PrismaLike) => Promise<T>) => Promise<T>;
};

type PrismaCatalogDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown | null>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<void>;
};

type PrismaTakeoffDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown | null>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<void>;
};

type PrismaAssemblyDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown | null>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<void>;
};

type PrismaComponentDelegate = {
  deleteMany: (args: unknown) => Promise<void>;
  createMany: (args: unknown) => Promise<void>;
};

type PrismaClassDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown | null>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<void>;
};

// ─── Row mappers ──────────────────────────────────────────────────────────────
type RawCatalogRow = {
  id: string; organizationId: string; category: string; name: string;
  abbreviation: string; description: string | null; active: boolean;
  defaultUnit: string; defaultColor: string; defaultSymbol: string | null;
  keywords: string; sortOrder: number; authorName: string; revision: number;
  createdAt: Date; updatedAt: Date;
};

function mapCatalog(r: RawCatalogRow): HvacCatalogItem {
  return {
    id: r.id, organizationId: r.organizationId,
    category: r.category as HvacCategory, name: r.name,
    abbreviation: r.abbreviation, description: r.description,
    active: r.active, defaultUnit: r.defaultUnit as HvacCatalogItem["defaultUnit"],
    defaultColor: r.defaultColor, defaultSymbol: r.defaultSymbol,
    keywords: JSON.parse(r.keywords) as string[],
    sortOrder: r.sortOrder, revision: r.revision,
    createdBy: { name: r.authorName },
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

type RawTakeoffRow = {
  id: string; planId: string; pageNumber: number | null; catalogItemId: string;
  sourceJson: string; unit: string; netQuantity: string; wastePercent: string;
  grossQuantity: string; equipmentTag: string | null; sizeJson: string | null;
  material: string | null; systemId: string | null; zoneId: string | null;
  levelId: string | null; phaseId: string | null; groupId: string | null;
  assemblyApplicationId: string | null; notes: string | null;
  customFieldsJson: string; status: string; locked: boolean; visible: boolean;
  authorName: string; revision: number; createdAt: Date; updatedAt: Date;
};

function mapTakeoff(r: RawTakeoffRow): TakeoffItem {
  return {
    id: r.id, planId: r.planId, pageNumber: r.pageNumber,
    catalogItemId: r.catalogItemId,
    source: JSON.parse(r.sourceJson) as TakeoffSource,
    unit: r.unit as TakeoffItem["unit"],
    netQuantity: r.netQuantity, wastePercent: r.wastePercent,
    grossQuantity: r.grossQuantity, equipmentTag: r.equipmentTag,
    size: r.sizeJson ? (JSON.parse(r.sizeJson) as TakeoffSize) : null,
    material: r.material, systemId: r.systemId, zoneId: r.zoneId,
    levelId: r.levelId, phaseId: r.phaseId, groupId: r.groupId,
    notes: r.notes, customFields: JSON.parse(r.customFieldsJson) as Record<string, unknown>,
    status: r.status as "open" | "resolved", locked: r.locked, visible: r.visible,
    revision: r.revision, createdBy: { name: r.authorName },
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

type RawAssemblyRow = {
  id: string; organizationId: string; name: string; description: string | null;
  active: boolean; triggerCatalogItemId: string; authorName: string;
  revision: number; createdAt: Date; updatedAt: Date;
  components: RawComponentRow[];
};

type RawComponentRow = {
  id: string; assemblyId: string; catalogItemId: string; unit: string;
  ruleJson: string; wastePercent: string; sortOrder: number;
};

function mapAssembly(r: RawAssemblyRow): TakeoffAssembly {
  return {
    id: r.id, organizationId: r.organizationId, name: r.name,
    description: r.description, active: r.active,
    triggerCatalogItemId: r.triggerCatalogItemId,
    components: r.components.map((c) => ({
      id: c.id, assemblyId: c.assemblyId, catalogItemId: c.catalogItemId,
      unit: c.unit as AssemblyComponent["unit"],
      rule: JSON.parse(c.ruleJson) as AssemblyRule,
      wastePercent: c.wastePercent, sortOrder: c.sortOrder,
    })),
    revision: r.revision, createdBy: { name: r.authorName },
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

// ─── PrismaCatalogRepository ──────────────────────────────────────────────────
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly db: PrismaLike) {}

  async list(organizationId: string, filter?: { category?: HvacCategory; active?: boolean; search?: string }): Promise<HvacCatalogItem[]> {
    const where: Record<string, unknown> = { organizationId };
    if (filter?.category) where["category"] = filter.category;
    if (filter?.active != null) where["active"] = filter.active;
    const rows = await this.db.hvacCatalogItem.findMany({ where, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }) as RawCatalogRow[];
    let items = rows.map(mapCatalog);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q) || i.abbreviation.toLowerCase().includes(q));
    }
    return items;
  }

  async get(id: string): Promise<HvacCatalogItem | null> {
    const row = await this.db.hvacCatalogItem.findUnique({ where: { id } }) as RawCatalogRow | null;
    return row ? mapCatalog(row) : null;
  }

  async create(input: CreateCatalogInput): Promise<HvacCatalogItem> {
    const row = await this.db.hvacCatalogItem.create({
      data: {
        organizationId: input.organizationId, category: input.category, name: input.name,
        abbreviation: input.abbreviation, description: input.description, active: input.active,
        defaultUnit: input.defaultUnit, defaultColor: input.defaultColor,
        defaultSymbol: input.defaultSymbol, keywords: JSON.stringify(input.keywords),
        sortOrder: input.sortOrder, authorName: input.createdBy.name,
      },
    }) as RawCatalogRow;
    return mapCatalog(row);
  }

  async update(id: string, input: UpdateCatalogInput, expectedRevision: number): Promise<HvacCatalogItem> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, existing.revision);
    const data: Record<string, unknown> = { revision: { increment: 1 } };
    if (input.category != null) data["category"] = input.category;
    if (input.name != null) data["name"] = input.name;
    if (input.abbreviation != null) data["abbreviation"] = input.abbreviation;
    if (input.description !== undefined) data["description"] = input.description;
    if (input.active != null) data["active"] = input.active;
    if (input.defaultUnit != null) data["defaultUnit"] = input.defaultUnit;
    if (input.defaultColor != null) data["defaultColor"] = input.defaultColor;
    if (input.defaultSymbol !== undefined) data["defaultSymbol"] = input.defaultSymbol;
    if (input.keywords != null) data["keywords"] = JSON.stringify(input.keywords);
    if (input.sortOrder != null) data["sortOrder"] = input.sortOrder;
    const row = await this.db.hvacCatalogItem.update({ where: { id }, data }) as RawCatalogRow;
    return mapCatalog(row);
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, existing.revision);
    await this.db.hvacCatalogItem.delete({ where: { id } });
  }
}

// ─── PrismaTakeoffItemRepository ───────────────────────────────────────────────
export class PrismaTakeoffItemRepository implements TakeoffItemRepository {
  constructor(private readonly db: PrismaLike) {}

  async list(planId: string, filter?: TakeoffFilter): Promise<TakeoffItem[]> {
    const where: Record<string, unknown> = { planId };
    if (filter?.pageNumber != null) where["pageNumber"] = filter.pageNumber;
    if (filter?.catalogItemId) where["catalogItemId"] = filter.catalogItemId;
    if (filter?.systemId) where["systemId"] = filter.systemId;
    if (filter?.zoneId) where["zoneId"] = filter.zoneId;
    if (filter?.levelId) where["levelId"] = filter.levelId;
    if (filter?.phaseId) where["phaseId"] = filter.phaseId;
    if (filter?.groupId) where["groupId"] = filter.groupId;
    if (filter?.status) where["status"] = filter.status;
    if (filter?.locked != null) where["locked"] = filter.locked;
    const rows = await this.db.takeoffItem.findMany({ where, orderBy: { createdAt: "asc" } }) as RawTakeoffRow[];
    return rows.map(mapTakeoff);
  }

  async get(id: string): Promise<TakeoffItem | null> {
    const row = await this.db.takeoffItem.findUnique({ where: { id } }) as RawTakeoffRow | null;
    return row ? mapTakeoff(row) : null;
  }

  async create(input: CreateTakeoffInput): Promise<TakeoffItem> {
    const gross = calculateGrossQuantity(input.netQuantity, input.wastePercent);
    const row = await this.db.takeoffItem.create({
      data: {
        planId: input.planId, pageNumber: input.pageNumber ?? null,
        catalogItemId: input.catalogItemId, sourceJson: JSON.stringify(input.source),
        unit: input.unit, netQuantity: input.netQuantity, wastePercent: input.wastePercent,
        grossQuantity: gross, equipmentTag: input.equipmentTag ?? null,
        sizeJson: input.size ? JSON.stringify(input.size) : null,
        material: input.material ?? null, systemId: input.systemId ?? null,
        zoneId: input.zoneId ?? null, levelId: input.levelId ?? null,
        phaseId: input.phaseId ?? null, groupId: input.groupId ?? null,
        notes: input.notes ?? null,
        customFieldsJson: JSON.stringify(input.customFields ?? {}),
        status: input.status, locked: input.locked, visible: input.visible,
        authorName: input.createdBy.name,
      },
    }) as RawTakeoffRow;
    return mapTakeoff(row);
  }

  async update(id: string, input: UpdateTakeoffInput, expectedRevision: number): Promise<TakeoffItem> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, existing.revision);
    const net = input.netQuantity ?? existing.netQuantity;
    const waste = input.wastePercent ?? existing.wastePercent;
    const data: Record<string, unknown> = {
      grossQuantity: calculateGrossQuantity(net, waste),
      revision: { increment: 1 },
    };
    if (input.netQuantity != null) data["netQuantity"] = input.netQuantity;
    if (input.wastePercent != null) data["wastePercent"] = input.wastePercent;
    if (input.unit != null) data["unit"] = input.unit;
    if (input.equipmentTag !== undefined) data["equipmentTag"] = input.equipmentTag;
    if (input.size !== undefined) data["sizeJson"] = input.size ? JSON.stringify(input.size) : null;
    if (input.material !== undefined) data["material"] = input.material;
    if (input.systemId !== undefined) data["systemId"] = input.systemId;
    if (input.zoneId !== undefined) data["zoneId"] = input.zoneId;
    if (input.levelId !== undefined) data["levelId"] = input.levelId;
    if (input.phaseId !== undefined) data["phaseId"] = input.phaseId;
    if (input.groupId !== undefined) data["groupId"] = input.groupId;
    if (input.notes !== undefined) data["notes"] = input.notes;
    if (input.customFields != null) data["customFieldsJson"] = JSON.stringify(input.customFields);
    if (input.status != null) data["status"] = input.status;
    if (input.locked != null) data["locked"] = input.locked;
    if (input.visible != null) data["visible"] = input.visible;
    if (input.source != null) data["sourceJson"] = JSON.stringify(input.source);
    if (input.pageNumber !== undefined) data["pageNumber"] = input.pageNumber;
    const row = await this.db.takeoffItem.update({ where: { id }, data }) as RawTakeoffRow;
    return mapTakeoff(row);
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, existing.revision);
    await this.db.takeoffItem.delete({ where: { id } });
  }

  async batch(planId: string, { items }: TakeoffBatchInput): Promise<TakeoffBatchResult> {
    const results: TakeoffBatchResultItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const op = items[i];
      try {
        if (op.op === "create") {
          const item = await this.create(op.input);
          results.push({ op: "create", item });
        } else if (op.op === "update") {
          const item = await this.update(op.id, op.input, op.expectedRevision);
          results.push({ op: "update", item });
        } else if (op.op === "delete") {
          await this.delete(op.id, op.expectedRevision);
          results.push({ op: "delete", id: op.id });
        }
      } catch (err) {
        const e = err as { code?: string; message?: string };
        results.push({ op: "error", index: i, code: e.code ?? "UNKNOWN", message: e.message ?? "Unknown" });
      }
    }
    return { results };
  }

  async listBySourceMeasurement(measurementId: string): Promise<TakeoffItem[]> {
    const rows = await this.db.takeoffItem.findMany({ where: {} }) as RawTakeoffRow[];
    return rows.map(mapTakeoff).filter((i) => i.source.kind === "measurement" && (i.source as { measurementId: string }).measurementId === measurementId);
  }

  async listBySourceMarkup(markupId: string): Promise<TakeoffItem[]> {
    const rows = await this.db.takeoffItem.findMany({ where: {} }) as RawTakeoffRow[];
    return rows.map(mapTakeoff).filter((i) => i.source.kind === "count-marker" && (i.source as { markupId: string }).markupId === markupId);
  }
}

// ─── PrismaAssemblyRepository ──────────────────────────────────────────────────
export class PrismaAssemblyRepository implements AssemblyRepository {
  constructor(private readonly db: PrismaLike) {}

  async list(organizationId: string): Promise<TakeoffAssembly[]> {
    const rows = await this.db.takeoffAssembly.findMany({
      where: { organizationId },
      include: { components: true },
      orderBy: { name: "asc" },
    }) as RawAssemblyRow[];
    return rows.map(mapAssembly);
  }

  async get(id: string): Promise<TakeoffAssembly | null> {
    const row = await this.db.takeoffAssembly.findUnique({ where: { id }, include: { components: true } }) as RawAssemblyRow | null;
    return row ? mapAssembly(row) : null;
  }

  async create(input: CreateAssemblyInput): Promise<TakeoffAssembly> {
    const row = await this.db.takeoffAssembly.create({
      data: {
        organizationId: input.organizationId, name: input.name,
        description: input.description, active: input.active,
        triggerCatalogItemId: input.triggerCatalogItemId, authorName: input.createdBy.name,
        components: {
          create: input.components.map((c, idx) => ({
            catalogItemId: c.catalogItemId, unit: c.unit,
            ruleJson: JSON.stringify(c.rule), wastePercent: c.wastePercent ?? "0",
            sortOrder: c.sortOrder ?? idx,
          })),
        },
      },
      include: { components: true },
    }) as RawAssemblyRow;
    return mapAssembly(row);
  }

  async update(id: string, input: UpdateAssemblyInput, expectedRevision: number): Promise<TakeoffAssembly> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, existing.revision);
    const data: Record<string, unknown> = { revision: { increment: 1 } };
    if (input.name != null) data["name"] = input.name;
    if (input.description !== undefined) data["description"] = input.description;
    if (input.active != null) data["active"] = input.active;
    if (input.triggerCatalogItemId != null) data["triggerCatalogItemId"] = input.triggerCatalogItemId;
    if (input.components) {
      await this.db.assemblyComponent.deleteMany({ where: { assemblyId: id } });
      await this.db.assemblyComponent.createMany({
        data: input.components.map((c, idx) => ({
          assemblyId: id, catalogItemId: c.catalogItemId, unit: c.unit,
          ruleJson: JSON.stringify(c.rule), wastePercent: c.wastePercent ?? "0",
          sortOrder: c.sortOrder ?? idx,
        })),
      });
    }
    const row = await this.db.takeoffAssembly.update({ where: { id }, data, include: { components: true } }) as RawAssemblyRow;
    return mapAssembly(row);
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, existing.revision);
    await this.db.takeoffAssembly.delete({ where: { id } });
  }
}

// ─── Prisma classification repositories ────────────────────────────────────────
function makePrismaClassRepo<T, Input>(delegate: () => PrismaClassDelegate, mapper: (r: unknown) => T) {
  return class {
    list(planId: string): Promise<T[]> {
      return delegate().findMany({ where: { planId } }).then((rows) => (rows as unknown[]).map(mapper));
    }
    get(id: string): Promise<T | null> {
      return delegate().findUnique({ where: { id } }).then((r) => r ? mapper(r) : null);
    }
    create(input: Input): Promise<T> {
      return delegate().create({ data: input }).then(mapper);
    }
    update(id: string, input: Partial<Input>): Promise<T> {
      return delegate().update({ where: { id }, data: input }).then(mapper);
    }
    delete(id: string): Promise<void> {
      return delegate().delete({ where: { id } }).then(() => undefined);
    }
  };
}

function systemMapper(r: unknown): ProjectSystem {
  const row = r as { id: string; planId: string; name: string; color: string; createdAt: Date; updatedAt: Date };
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
function zoneMapper(r: unknown): ProjectZone {
  const row = r as { id: string; planId: string; name: string; createdAt: Date; updatedAt: Date };
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
function levelMapper(r: unknown): ProjectLevel {
  const row = r as { id: string; planId: string; name: string; elevation: number | null; createdAt: Date; updatedAt: Date };
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
function phaseMapper(r: unknown): ProjectPhase {
  const row = r as { id: string; planId: string; name: string; sortOrder: number; createdAt: Date; updatedAt: Date };
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
function groupMapper(r: unknown): TakeoffGroup {
  const row = r as { id: string; planId: string; name: string; color: string; createdAt: Date; updatedAt: Date };
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

const SystemBase = makePrismaClassRepo<ProjectSystem, Omit<ProjectSystem, "id" | "createdAt" | "updatedAt">>(() => ({} as PrismaClassDelegate), systemMapper);
const ZoneBase = makePrismaClassRepo<ProjectZone, Omit<ProjectZone, "id" | "createdAt" | "updatedAt">>(() => ({} as PrismaClassDelegate), zoneMapper);
const LevelBase = makePrismaClassRepo<ProjectLevel, Omit<ProjectLevel, "id" | "createdAt" | "updatedAt">>(() => ({} as PrismaClassDelegate), levelMapper);
const PhaseBase = makePrismaClassRepo<ProjectPhase, Omit<ProjectPhase, "id" | "createdAt" | "updatedAt">>(() => ({} as PrismaClassDelegate), phaseMapper);
const GroupBase = makePrismaClassRepo<TakeoffGroup, Omit<TakeoffGroup, "id" | "createdAt" | "updatedAt">>(() => ({} as PrismaClassDelegate), groupMapper);

export class PrismaProjectSystemRepository extends SystemBase implements ProjectSystemRepository {
  constructor(private readonly db: PrismaLike) { super(); }
  override list(planId: string) { return this.db.projectSystem.findMany({ where: { planId } }).then((r) => (r as unknown[]).map(systemMapper)); }
  override get(id: string) { return this.db.projectSystem.findUnique({ where: { id } }).then((r) => r ? systemMapper(r) : null); }
  override create(input: Omit<ProjectSystem, "id" | "createdAt" | "updatedAt">) { return this.db.projectSystem.create({ data: input }).then(systemMapper); }
  override update(id: string, input: Partial<Pick<ProjectSystem, "name" | "color">>) { return this.db.projectSystem.update({ where: { id }, data: input }).then(systemMapper); }
  override delete(id: string) { return this.db.projectSystem.delete({ where: { id } }).then(() => undefined); }
}

export class PrismaProjectZoneRepository extends ZoneBase implements ProjectZoneRepository {
  constructor(private readonly db: PrismaLike) { super(); }
  override list(planId: string) { return this.db.projectZone.findMany({ where: { planId } }).then((r) => (r as unknown[]).map(zoneMapper)); }
  override get(id: string) { return this.db.projectZone.findUnique({ where: { id } }).then((r) => r ? zoneMapper(r) : null); }
  override create(input: Omit<ProjectZone, "id" | "createdAt" | "updatedAt">) { return this.db.projectZone.create({ data: input }).then(zoneMapper); }
  override update(id: string, input: Partial<Pick<ProjectZone, "name">>) { return this.db.projectZone.update({ where: { id }, data: input }).then(zoneMapper); }
  override delete(id: string) { return this.db.projectZone.delete({ where: { id } }).then(() => undefined); }
}

export class PrismaProjectLevelRepository extends LevelBase implements ProjectLevelRepository {
  constructor(private readonly db: PrismaLike) { super(); }
  override list(planId: string) { return this.db.projectLevel.findMany({ where: { planId } }).then((r) => (r as unknown[]).map(levelMapper)); }
  override get(id: string) { return this.db.projectLevel.findUnique({ where: { id } }).then((r) => r ? levelMapper(r) : null); }
  override create(input: Omit<ProjectLevel, "id" | "createdAt" | "updatedAt">) { return this.db.projectLevel.create({ data: input }).then(levelMapper); }
  override update(id: string, input: Partial<Pick<ProjectLevel, "name" | "elevation">>) { return this.db.projectLevel.update({ where: { id }, data: input }).then(levelMapper); }
  override delete(id: string) { return this.db.projectLevel.delete({ where: { id } }).then(() => undefined); }
}

export class PrismaProjectPhaseRepository extends PhaseBase implements ProjectPhaseRepository {
  constructor(private readonly db: PrismaLike) { super(); }
  override list(planId: string) { return this.db.projectPhase.findMany({ where: { planId }, orderBy: { sortOrder: "asc" } }).then((r) => (r as unknown[]).map(phaseMapper)); }
  override get(id: string) { return this.db.projectPhase.findUnique({ where: { id } }).then((r) => r ? phaseMapper(r) : null); }
  override create(input: Omit<ProjectPhase, "id" | "createdAt" | "updatedAt">) { return this.db.projectPhase.create({ data: input }).then(phaseMapper); }
  override update(id: string, input: Partial<Pick<ProjectPhase, "name" | "sortOrder">>) { return this.db.projectPhase.update({ where: { id }, data: input }).then(phaseMapper); }
  override delete(id: string) { return this.db.projectPhase.delete({ where: { id } }).then(() => undefined); }
}

export class PrismaTakeoffGroupRepository extends GroupBase implements TakeoffGroupRepository {
  constructor(private readonly db: PrismaLike) { super(); }
  override list(planId: string) { return this.db.takeoffGroup.findMany({ where: { planId } }).then((r) => (r as unknown[]).map(groupMapper)); }
  override get(id: string) { return this.db.takeoffGroup.findUnique({ where: { id } }).then((r) => r ? groupMapper(r) : null); }
  override create(input: Omit<TakeoffGroup, "id" | "createdAt" | "updatedAt">) { return this.db.takeoffGroup.create({ data: input }).then(groupMapper); }
  override update(id: string, input: Partial<Pick<TakeoffGroup, "name" | "color">>) { return this.db.takeoffGroup.update({ where: { id }, data: input }).then(groupMapper); }
  override delete(id: string) { return this.db.takeoffGroup.delete({ where: { id } }).then(() => undefined); }
}
