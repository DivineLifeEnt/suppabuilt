import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

// ─── UUID guard ────────────────────────────────────────────────────────────────
// More permissive — also allow cuid-style IDs (alphanumeric, starts with 'c')
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,200}$/;

function assertSafeId(id: string, label = "id"): void {
  if (!SAFE_ID_RE.test(id)) throw new Error(`Invalid ${label}: "${id}"`);
}

// ─── Atomic write + lock pattern (reused from local-markup-repository) ────────
const locks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let resolve!: () => void;
  const next = new Promise<void>((r) => { resolve = r; });
  locks.set(key, next);
  try {
    await prev;
    return await fn();
  } finally {
    resolve();
    if (locks.get(key) === next) locks.delete(key);
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  if (!existsSync(filePath)) return null;
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${Date.now()}`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, filePath);
}

function getStorageRoot(): string {
  return path.join(process.cwd(), "storage");
}

// ─── Store types ──────────────────────────────────────────────────────────────
type CatalogStore = Record<string, HvacCatalogItem>;
type TakeoffStore = {
  items: Record<string, TakeoffItem>;
  systems: Record<string, ProjectSystem>;
  zones: Record<string, ProjectZone>;
  levels: Record<string, ProjectLevel>;
  phases: Record<string, ProjectPhase>;
  groups: Record<string, TakeoffGroup>;
};
type AssemblyStore = Record<string, TakeoffAssembly>;

// ─── File paths ────────────────────────────────────────────────────────────────
function catalogFile(root: string, orgId: string): string {
  assertSafeId(orgId, "organizationId");
  return path.join(root, "catalog", `org-${orgId}.json`);
}

function takeoffFile(root: string, planId: string): string {
  assertSafeId(planId, "planId");
  return path.join(root, "takeoff", `${planId}.json`);
}

function assemblyFile(root: string, orgId: string): string {
  assertSafeId(orgId, "organizationId");
  return path.join(root, "assemblies", `org-${orgId}.json`);
}

// ─── LocalCatalogRepository ────────────────────────────────────────────────────
export class LocalCatalogRepository implements CatalogRepository {
  private readonly root: string;
  constructor(root?: string) { this.root = root ?? getStorageRoot(); }

  private async readStore(orgId: string): Promise<CatalogStore> {
    return (await readJsonFile<CatalogStore>(catalogFile(this.root, orgId))) ?? {};
  }

  private async writeStore(orgId: string, store: CatalogStore): Promise<void> {
    await writeJsonFile(catalogFile(this.root, orgId), store);
  }

  async list(
    organizationId: string,
    filter?: { category?: HvacCategory; active?: boolean; search?: string }
  ): Promise<HvacCatalogItem[]> {
    assertSafeId(organizationId, "organizationId");
    const store = await this.readStore(organizationId);
    let items = Object.values(store);
    if (filter?.category) items = items.filter((i) => i.category === filter.category);
    if (filter?.active != null) items = items.filter((i) => i.active === filter.active);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.abbreviation.toLowerCase().includes(q) ||
          i.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<HvacCatalogItem | null> {
    assertSafeId(id);
    // Search across all org files
    const dir = path.join(this.root, "catalog");
    if (!existsSync(dir)) return null;
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp")); }
    catch { return null; }
    for (const file of files) {
      const store = await readJsonFile<CatalogStore>(path.join(dir, file)) ?? {};
      if (store[id]) return store[id];
    }
    return null;
  }

  async create(input: CreateCatalogInput): Promise<HvacCatalogItem> {
    assertSafeId(input.organizationId, "organizationId");
    const orgId = input.organizationId;
    return withLock(`catalog-${orgId}`, async () => {
      const store = await this.readStore(orgId);
      const id = randomUUID();
      const now = new Date().toISOString();
      const item: HvacCatalogItem = {
        ...input,
        id,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      store[id] = item;
      await this.writeStore(orgId, store);
      return item;
    });
  }

  async update(id: string, input: UpdateCatalogInput, expectedRevision: number): Promise<HvacCatalogItem> {
    assertSafeId(id);
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    const orgId = existing.organizationId;
    return withLock(`catalog-${orgId}`, async () => {
      const store = await this.readStore(orgId);
      const item = store[id];
      if (!item) throw new NotFoundError(id);
      if (item.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, item.revision);
      const updated: HvacCatalogItem = {
        ...item,
        ...input,
        id,
        organizationId: item.organizationId,
        revision: item.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      store[id] = updated;
      await this.writeStore(orgId, store);
      return updated;
    });
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    assertSafeId(id);
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    const orgId = existing.organizationId;
    return withLock(`catalog-${orgId}`, async () => {
      const store = await this.readStore(orgId);
      const item = store[id];
      if (!item) throw new NotFoundError(id);
      if (item.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, item.revision);
      delete store[id];
      await this.writeStore(orgId, store);
    });
  }
}

// ─── LocalTakeoffItemRepository ────────────────────────────────────────────────
export class LocalTakeoffItemRepository implements TakeoffItemRepository {
  private readonly root: string;
  constructor(root?: string) { this.root = root ?? getStorageRoot(); }

  private async readStore(planId: string): Promise<TakeoffStore> {
    const stored = await readJsonFile<TakeoffStore>(takeoffFile(this.root, planId));
    return stored ?? { items: {}, systems: {}, zones: {}, levels: {}, phases: {}, groups: {} };
  }

  private async writeStore(planId: string, store: TakeoffStore): Promise<void> {
    await writeJsonFile(takeoffFile(this.root, planId), store);
  }

  async list(planId: string, filter?: TakeoffFilter): Promise<TakeoffItem[]> {
    assertSafeId(planId, "planId");
    const store = await this.readStore(planId);
    let items = Object.values(store.items);
    if (filter) {
      if (filter.pageNumber != null) items = items.filter((i) => i.pageNumber === filter.pageNumber);
      if (filter.catalogItemId) items = items.filter((i) => i.catalogItemId === filter.catalogItemId);
      if (filter.systemId) items = items.filter((i) => i.systemId === filter.systemId);
      if (filter.zoneId) items = items.filter((i) => i.zoneId === filter.zoneId);
      if (filter.levelId) items = items.filter((i) => i.levelId === filter.levelId);
      if (filter.phaseId) items = items.filter((i) => i.phaseId === filter.phaseId);
      if (filter.groupId) items = items.filter((i) => i.groupId === filter.groupId);
      if (filter.status) items = items.filter((i) => i.status === filter.status);
      if (filter.locked != null) items = items.filter((i) => i.locked === filter.locked);
    }
    return items;
  }

  async get(id: string): Promise<TakeoffItem | null> {
    assertSafeId(id);
    const dir = path.join(this.root, "takeoff");
    if (!existsSync(dir)) return null;
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp")); }
    catch { return null; }
    for (const file of files) {
      const store = await readJsonFile<TakeoffStore>(path.join(dir, file));
      if (store?.items[id]) return store.items[id];
    }
    return null;
  }

  private buildItem(input: CreateTakeoffInput, id: string): TakeoffItem {
    const now = new Date().toISOString();
    const grossQuantity = calculateGrossQuantity(input.netQuantity, input.wastePercent);
    return {
      ...input,
      id,
      grossQuantity,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  async create(input: CreateTakeoffInput): Promise<TakeoffItem> {
    assertSafeId(input.planId, "planId");
    return withLock(`takeoff-${input.planId}`, async () => {
      const store = await this.readStore(input.planId);
      const id = randomUUID();
      const item = this.buildItem(input, id);
      store.items[id] = item;
      await this.writeStore(input.planId, store);
      return item;
    });
  }

  async update(id: string, input: UpdateTakeoffInput, expectedRevision: number): Promise<TakeoffItem> {
    assertSafeId(id);
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    const planId = existing.planId;
    return withLock(`takeoff-${planId}`, async () => {
      const store = await this.readStore(planId);
      const item = store.items[id];
      if (!item) throw new NotFoundError(id);
      if (item.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, item.revision);
      const net = input.netQuantity ?? item.netQuantity;
      const waste = input.wastePercent ?? item.wastePercent;
      const grossQuantity = calculateGrossQuantity(net, waste);
      const updated: TakeoffItem = {
        ...item,
        ...input,
        id,
        planId,
        grossQuantity,
        revision: item.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      store.items[id] = updated;
      await this.writeStore(planId, store);
      return updated;
    });
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    assertSafeId(id);
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    const planId = existing.planId;
    return withLock(`takeoff-${planId}`, async () => {
      const store = await this.readStore(planId);
      const item = store.items[id];
      if (!item) throw new NotFoundError(id);
      if (item.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, item.revision);
      delete store.items[id];
      await this.writeStore(planId, store);
    });
  }

  async batch(planId: string, { items }: TakeoffBatchInput): Promise<TakeoffBatchResult> {
    assertSafeId(planId, "planId");
    return withLock(`takeoff-${planId}`, async () => {
      const store = await this.readStore(planId);
      const results: TakeoffBatchResultItem[] = [];

      for (let i = 0; i < items.length; i++) {
        const op = items[i];
        try {
          if (op.op === "create") {
            const id = randomUUID();
            const item = this.buildItem(op.input, id);
            store.items[id] = item;
            results.push({ op: "create", item });
          } else if (op.op === "update") {
            const m = store.items[op.id];
            if (!m) throw new NotFoundError(op.id);
            if (m.revision !== op.expectedRevision) throw new ConflictError(op.id, op.expectedRevision, m.revision);
            const net = op.input.netQuantity ?? m.netQuantity;
            const waste = op.input.wastePercent ?? m.wastePercent;
            const updated: TakeoffItem = {
              ...m,
              ...op.input,
              id: op.id,
              planId,
              grossQuantity: calculateGrossQuantity(net, waste),
              revision: m.revision + 1,
              updatedAt: new Date().toISOString(),
            };
            store.items[op.id] = updated;
            results.push({ op: "update", item: updated });
          } else if (op.op === "delete") {
            const m = store.items[op.id];
            if (!m) throw new NotFoundError(op.id);
            if (m.revision !== op.expectedRevision) throw new ConflictError(op.id, op.expectedRevision, m.revision);
            delete store.items[op.id];
            results.push({ op: "delete", id: op.id });
          }
        } catch (err) {
          const e = err as { code?: string; message?: string };
          results.push({ op: "error", index: i, code: e.code ?? "UNKNOWN", message: e.message ?? "Unknown error" });
        }
      }

      await this.writeStore(planId, store);
      return { results };
    });
  }

  async listBySourceMeasurement(measurementId: string): Promise<TakeoffItem[]> {
    const dir = path.join(this.root, "takeoff");
    if (!existsSync(dir)) return [];
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp")); }
    catch { return []; }
    const results: TakeoffItem[] = [];
    for (const file of files) {
      const store = await readJsonFile<TakeoffStore>(path.join(dir, file));
      if (!store) continue;
      for (const item of Object.values(store.items)) {
        if (item.source.kind === "measurement" && item.source.measurementId === measurementId) {
          results.push(item);
        }
      }
    }
    return results;
  }

  async listBySourceMarkup(markupId: string): Promise<TakeoffItem[]> {
    const dir = path.join(this.root, "takeoff");
    if (!existsSync(dir)) return [];
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp")); }
    catch { return []; }
    const results: TakeoffItem[] = [];
    for (const file of files) {
      const store = await readJsonFile<TakeoffStore>(path.join(dir, file));
      if (!store) continue;
      for (const item of Object.values(store.items)) {
        if (item.source.kind === "count-marker" && (item.source as { markupId: string }).markupId === markupId) {
          results.push(item);
        }
      }
    }
    return results;
  }
}

// ─── LocalAssemblyRepository ───────────────────────────────────────────────────
export class LocalAssemblyRepository implements AssemblyRepository {
  private readonly root: string;
  constructor(root?: string) { this.root = root ?? getStorageRoot(); }

  private async readStore(orgId: string): Promise<AssemblyStore> {
    return (await readJsonFile<AssemblyStore>(assemblyFile(this.root, orgId))) ?? {};
  }

  private async writeStore(orgId: string, store: AssemblyStore): Promise<void> {
    await writeJsonFile(assemblyFile(this.root, orgId), store);
  }

  async list(organizationId: string): Promise<TakeoffAssembly[]> {
    assertSafeId(organizationId, "organizationId");
    const store = await this.readStore(organizationId);
    return Object.values(store).sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<TakeoffAssembly | null> {
    assertSafeId(id);
    const dir = path.join(this.root, "assemblies");
    if (!existsSync(dir)) return null;
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp")); }
    catch { return null; }
    for (const file of files) {
      const store = await readJsonFile<AssemblyStore>(path.join(dir, file)) ?? {};
      if (store[id]) return store[id];
    }
    return null;
  }

  async create(input: CreateAssemblyInput): Promise<TakeoffAssembly> {
    assertSafeId(input.organizationId, "organizationId");
    const orgId = input.organizationId;
    return withLock(`assembly-${orgId}`, async () => {
      const store = await this.readStore(orgId);
      const id = randomUUID();
      const now = new Date().toISOString();
      const components: AssemblyComponent[] = (input.components ?? []).map((c, idx) => ({
        ...c,
        id: randomUUID(),
        assemblyId: id,
        sortOrder: c.sortOrder ?? idx,
      }));
      const assembly: TakeoffAssembly = {
        ...input,
        id,
        components,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      store[id] = assembly;
      await this.writeStore(orgId, store);
      return assembly;
    });
  }

  async update(id: string, input: UpdateAssemblyInput, expectedRevision: number): Promise<TakeoffAssembly> {
    assertSafeId(id);
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    const orgId = existing.organizationId;
    return withLock(`assembly-${orgId}`, async () => {
      const store = await this.readStore(orgId);
      const assembly = store[id];
      if (!assembly) throw new NotFoundError(id);
      if (assembly.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, assembly.revision);

      let components = assembly.components;
      if (input.components) {
        components = input.components.map((c, idx) => ({
          ...c,
          id: randomUUID(),
          assemblyId: id,
          sortOrder: c.sortOrder ?? idx,
        }));
      }

      const updated: TakeoffAssembly = {
        ...assembly,
        ...input,
        id,
        organizationId: assembly.organizationId,
        components,
        revision: assembly.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      store[id] = updated;
      await this.writeStore(orgId, store);
      return updated;
    });
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    assertSafeId(id);
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    const orgId = existing.organizationId;
    return withLock(`assembly-${orgId}`, async () => {
      const store = await this.readStore(orgId);
      const assembly = store[id];
      if (!assembly) throw new NotFoundError(id);
      if (assembly.revision !== expectedRevision) throw new ConflictError(id, expectedRevision, assembly.revision);
      delete store[id];
      await this.writeStore(orgId, store);
    });
  }
}

// ─── Classification repositories (all use the takeoff store per plan) ─────────

function makeClassificationRepo<
  T extends { id: string; planId: string; createdAt: string; updatedAt: string },
  K extends keyof TakeoffStore,
>(storeKey: K) {
  return class LocalClassRepo {
    private readonly root: string;
    constructor(root?: string) { this.root = root ?? getStorageRoot(); }

    private async readStore(planId: string): Promise<TakeoffStore> {
      const stored = await readJsonFile<TakeoffStore>(takeoffFile(this.root, planId));
      return stored ?? { items: {}, systems: {}, zones: {}, levels: {}, phases: {}, groups: {} };
    }

    private async writeStore(planId: string, store: TakeoffStore): Promise<void> {
      await writeJsonFile(takeoffFile(this.root, planId), store);
    }

    async list(planId: string): Promise<T[]> {
      assertSafeId(planId, "planId");
      const store = await this.readStore(planId);
      return Object.values(store[storeKey] as unknown as Record<string, T>);
    }

    async get(id: string): Promise<T | null> {
      assertSafeId(id);
      const dir = path.join(this.root, "takeoff");
      if (!existsSync(dir)) return null;
      const { readdirSync } = await import("node:fs");
      let files: string[] = [];
      try { files = readdirSync(dir).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp")); }
      catch { return null; }
      for (const file of files) {
        const store = await readJsonFile<TakeoffStore>(path.join(dir, file));
        const bucket = store?.[storeKey] as unknown as Record<string, T> | undefined;
        const rec = bucket?.[id];
        if (rec) return rec;
      }
      return null;
    }

    async create(input: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
      const planId = (input as { planId: string }).planId;
      assertSafeId(planId, "planId");
      return withLock(`takeoff-${planId}`, async () => {
        const store = await this.readStore(planId);
        const id = randomUUID();
        const now = new Date().toISOString();
        const record = { ...input, id, createdAt: now, updatedAt: now } as unknown as T;
        (store[storeKey] as unknown as Record<string, T>)[id] = record;
        await this.writeStore(planId, store);
        return record;
      });
    }

    async update(id: string, input: Partial<T>): Promise<T> {
      assertSafeId(id);
      const existing = await this.get(id);
      if (!existing) throw new NotFoundError(id);
      const planId = existing.planId;
      return withLock(`takeoff-${planId}`, async () => {
        const store = await this.readStore(planId);
        const bucket = store[storeKey] as unknown as Record<string, T>;
        const record = bucket[id];
        if (!record) throw new NotFoundError(id);
        const updated = { ...record, ...input, id, updatedAt: new Date().toISOString() } as unknown as T;
        bucket[id] = updated;
        await this.writeStore(planId, store);
        return updated;
      });
    }

    async delete(id: string): Promise<void> {
      assertSafeId(id);
      const existing = await this.get(id);
      if (!existing) throw new NotFoundError(id);
      const planId = existing.planId;
      return withLock(`takeoff-${planId}`, async () => {
        const store = await this.readStore(planId);
        delete (store[storeKey] as unknown as Record<string, T>)[id];
        await this.writeStore(planId, store);
      });
    }
  };
}

const LocalSystemRepo = makeClassificationRepo<ProjectSystem, "systems">("systems");
const LocalZoneRepo = makeClassificationRepo<ProjectZone, "zones">("zones");
const LocalLevelRepo = makeClassificationRepo<ProjectLevel, "levels">("levels");
const LocalPhaseRepo = makeClassificationRepo<ProjectPhase, "phases">("phases");
const LocalGroupRepo = makeClassificationRepo<TakeoffGroup, "groups">("groups");

export class LocalProjectSystemRepository extends LocalSystemRepo implements ProjectSystemRepository {}
export class LocalProjectZoneRepository extends LocalZoneRepo implements ProjectZoneRepository {}
export class LocalProjectLevelRepository extends LocalLevelRepo implements ProjectLevelRepository {}
export class LocalProjectPhaseRepository extends LocalPhaseRepo implements ProjectPhaseRepository {}
export class LocalTakeoffGroupRepository extends LocalGroupRepo implements TakeoffGroupRepository {}

// Export TakeoffSource type guard helper
export function isManualSource(s: TakeoffSource): boolean { return s.kind === "manual"; }
