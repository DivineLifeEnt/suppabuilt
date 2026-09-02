import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Measurement,
  Calibration,
  MeasurementGroup,
  CreateMeasurementInput,
  UpdateMeasurementInput,
  CreateCalibrationInput,
  UpdateCalibrationInput,
  CreateGroupInput,
  UpdateGroupInput,
  MeasurementBatchInput,
  MeasurementBatchResult,
  MeasurementBatchResultItem,
  MeasurementAuthor,
} from "@/lib/measurement/types";
import {
  type MeasurementRepository,
  type CalibrationRepository,
  type MeasurementGroupRepository,
  ConflictError,
  NotFoundError,
} from "./measurement-repository";
import { normalizedDistance } from "@/lib/measurement/units";

// ─── Path traversal guard (allow UUIDs and safe alphanumeric IDs like "local") ─
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,200}$/;

function assertSafeId(id: string, label = "planId"): void {
  if (!SAFE_ID_RE.test(id)) throw new Error(`Invalid ${label}: ${id}`);
}

// ─── Per-plan file locks ──────────────────────────────────────────────────────
const mLocks = new Map<string, Promise<void>>();
const cLocks = new Map<string, Promise<void>>();

async function withLock<T>(
  lockMap: Map<string, Promise<void>>,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const prev = lockMap.get(key) ?? Promise.resolve();
  let resolve!: () => void;
  const next = new Promise<void>((r) => { resolve = r; });
  lockMap.set(key, next);
  try {
    await prev;
    return await fn();
  } finally {
    resolve();
    if (lockMap.get(key) === next) lockMap.delete(key);
  }
}

// ─── Storage structures ───────────────────────────────────────────────────────
type MeasurementStore = {
  measurements: Record<string, Measurement>;
  groups: Record<string, MeasurementGroup>;
};

type CalibrationStore = Record<string, Calibration>;

// ─── File helpers ─────────────────────────────────────────────────────────────
async function readJson<T>(file: string, fallback: T): Promise<T> {
  if (!existsSync(file)) return fallback;
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true });
  const tmp = `${file}.tmp-${Date.now()}`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, file);
}

// ─── Root resolution ──────────────────────────────────────────────────────────
function defaultMeasurementRoot() {
  return path.join(process.cwd(), "storage", "measurements");
}

function defaultCalibrationRoot() {
  return path.join(process.cwd(), "storage", "calibrations");
}

// ─── Builder helpers ──────────────────────────────────────────────────────────
const SYSTEM_AUTHOR: MeasurementAuthor = { name: "System" };

function buildMeasurement(input: CreateMeasurementInput, id: string): Measurement {
  const now = new Date().toISOString();
  return {
    ...input,
    id,
    revision: 1,
    createdBy: input.createdBy ?? SYSTEM_AUTHOR,
    createdAt: now,
    updatedAt: now,
  } as Measurement;
}

function applyMeasurementUpdate(m: Measurement, input: UpdateMeasurementInput): Measurement {
  const now = new Date().toISOString();
  const updated = { ...m, updatedAt: now, revision: m.revision + 1 };

  if (input.label !== undefined) updated.label = input.label ?? null;
  if (input.prefix !== undefined) updated.prefix = input.prefix ?? null;
  if (input.suffix !== undefined) updated.suffix = input.suffix ?? null;
  if (input.style != null) (updated as { style: typeof input.style }).style = { ...m.style, ...input.style };
  if (input.locked != null) updated.locked = input.locked;
  if (input.visible != null) updated.visible = input.visible;
  if (input.status != null) updated.status = input.status;
  if (input.groupId !== undefined) updated.groupId = input.groupId ?? null;
  if (input.zIndex != null) updated.zIndex = input.zIndex;

  // Type-specific geometry patches
  if (updated.type === "linear") {
    if (input.start) (updated as { start: typeof input.start }).start = input.start;
    if (input.end) (updated as { end: typeof input.end }).end = input.end;
    if (input.displayUnit) (updated as { displayUnit: typeof input.displayUnit }).displayUnit = input.displayUnit as Measurement extends { displayUnit: infer U } ? U : never;
    if (input.precision != null) (updated as { precision: number }).precision = input.precision;
  }
  if (updated.type === "polyline" || updated.type === "perimeter") {
    if (input.points) (updated as { points: typeof input.points }).points = input.points;
    if (input.displayUnit) (updated as { displayUnit: typeof input.displayUnit }).displayUnit = input.displayUnit as never;
    if (input.precision != null) (updated as { precision: number }).precision = input.precision;
  }
  if (updated.type === "polygon-area" || updated.type === "rectangle-area") {
    if (input.geometry) (updated as { geometry: typeof input.geometry }).geometry = input.geometry;
    if (input.displayUnit) (updated as { displayUnit: typeof input.displayUnit }).displayUnit = input.displayUnit as never;
    if (input.precision != null) (updated as { precision: number }).precision = input.precision;
  }
  if (updated.type === "volume") {
    if (input.geometry) (updated as { geometry: typeof input.geometry }).geometry = input.geometry;
    if (input.depthMillimeters != null) (updated as { depthMillimeters: number }).depthMillimeters = input.depthMillimeters;
    if (input.displayUnit) (updated as { displayUnit: typeof input.displayUnit }).displayUnit = input.displayUnit as never;
    if (input.precision != null) (updated as { precision: number }).precision = input.precision;
  }
  if (updated.type === "diameter" || updated.type === "radius") {
    if (input.center) (updated as { center: typeof input.center }).center = input.center;
    if (input.edge) (updated as { edge: typeof input.edge }).edge = input.edge;
    if (input.displayUnit) (updated as { displayUnit: typeof input.displayUnit }).displayUnit = input.displayUnit as never;
    if (input.precision != null) (updated as { precision: number }).precision = input.precision;
  }
  if (updated.type === "angle") {
    if (input.vertex) (updated as { vertex: typeof input.vertex }).vertex = input.vertex;
    if (input.start) (updated as { start: typeof input.start }).start = input.start;
    if (input.end) (updated as { end: typeof input.end }).end = input.end;
    if (input.precision != null) (updated as { precision: number }).precision = input.precision;
  }
  if (updated.type === "count") {
    if (input.points) (updated as { points: typeof input.points }).points = input.points;
  }

  return updated as Measurement;
}

// ─── Local Measurement Repository ────────────────────────────────────────────
export class LocalMeasurementRepository implements MeasurementRepository {
  private readonly root: string;

  constructor(root?: string) {
    this.root = root ?? defaultMeasurementRoot();
  }

  private file(planId: string): string {
    return path.join(this.root, `${planId}.json`);
  }

  private async read(planId: string): Promise<MeasurementStore> {
    return readJson<MeasurementStore>(this.file(planId), { measurements: {}, groups: {} });
  }

  private async write(planId: string, store: MeasurementStore): Promise<void> {
    await writeJson(this.file(planId), store);
  }

  async list(planId: string, pageNumber?: number, type?: string, groupId?: string): Promise<Measurement[]> {
    assertSafeId(planId);
    const store = await this.read(planId);
    let all = Object.values(store.measurements);
    if (pageNumber != null) all = all.filter((m) => m.pageNumber === pageNumber);
    if (type) all = all.filter((m) => m.type === type);
    if (groupId) all = all.filter((m) => m.groupId === groupId);
    return all;
  }

  async get(id: string): Promise<Measurement | null> {
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try {
      files = readdirSync(this.root).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp"));
    } catch {
      return null;
    }
    for (const file of files) {
      const planId = file.replace(/\.json$/, "");
      if (!SAFE_ID_RE.test(planId)) continue;
      const store = await this.read(planId);
      if (store.measurements[id]) return store.measurements[id];
    }
    return null;
  }

  async create(input: CreateMeasurementInput): Promise<Measurement> {
    assertSafeId(input.planId);
    return withLock(mLocks, input.planId, async () => {
      const store = await this.read(input.planId);
      const id = randomUUID();
      const m = buildMeasurement(input, id);
      store.measurements[id] = m;
      await this.write(input.planId, store);
      return m;
    });
  }

  async update(id: string, input: UpdateMeasurementInput, expectedRevision: number): Promise<Measurement> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    assertSafeId(existing.planId);
    return withLock(mLocks, existing.planId, async () => {
      const store = await this.read(existing.planId);
      const m = store.measurements[id];
      if (!m) throw new NotFoundError(id);
      if (m.revision !== expectedRevision) throw new ConflictError(m.revision);
      const updated = applyMeasurementUpdate(m, input);
      store.measurements[id] = updated;
      await this.write(existing.planId, store);
      return updated;
    });
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    assertSafeId(existing.planId);
    return withLock(mLocks, existing.planId, async () => {
      const store = await this.read(existing.planId);
      const m = store.measurements[id];
      if (!m) throw new NotFoundError(id);
      if (m.revision !== expectedRevision) throw new ConflictError(m.revision);
      delete store.measurements[id];
      await this.write(existing.planId, store);
    });
  }

  async batch(planId: string, { items }: MeasurementBatchInput): Promise<MeasurementBatchResult> {
    assertSafeId(planId);
    return withLock(mLocks, planId, async () => {
      const store = await this.read(planId);
      const results: MeasurementBatchResultItem[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          if (item.op === "create") {
            const id = randomUUID();
            const m = buildMeasurement(item.input, id);
            store.measurements[id] = m;
            results.push({ op: "create", measurement: m });
          } else if (item.op === "update") {
            const m = store.measurements[item.id];
            if (!m) throw new NotFoundError(item.id);
            if (m.revision !== item.expectedRevision) throw new ConflictError(m.revision);
            const updated = applyMeasurementUpdate(m, item.input);
            store.measurements[item.id] = updated;
            results.push({ op: "update", measurement: updated });
          } else if (item.op === "delete") {
            const m = store.measurements[item.id];
            if (!m) throw new NotFoundError(item.id);
            if (m.revision !== item.expectedRevision) throw new ConflictError(m.revision);
            delete store.measurements[item.id];
            results.push({ op: "delete", id: item.id });
          }
        } catch (err) {
          const e = err as { code?: string; message?: string };
          results.push({
            op: "error",
            index: i,
            code: e.code ?? "UNKNOWN",
            message: e.message ?? "Unknown error",
          });
        }
      }

      await this.write(planId, store);
      return { results };
    });
  }
}

// ─── Local Calibration Repository ────────────────────────────────────────────
export class LocalCalibrationRepository implements CalibrationRepository {
  private readonly root: string;

  constructor(root?: string) {
    this.root = root ?? defaultCalibrationRoot();
  }

  private file(planId: string): string {
    return path.join(this.root, `${planId}.json`);
  }

  private async read(planId: string): Promise<CalibrationStore> {
    return readJson<CalibrationStore>(this.file(planId), {});
  }

  private async write(planId: string, store: CalibrationStore): Promise<void> {
    await writeJson(this.file(planId), store);
  }

  async list(planId: string, pageNumber?: number): Promise<Calibration[]> {
    assertSafeId(planId);
    const store = await this.read(planId);
    const all = Object.values(store);
    return pageNumber != null ? all.filter((c) => c.pageNumber === pageNumber) : all;
  }

  async get(id: string): Promise<Calibration | null> {
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try {
      files = readdirSync(this.root).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp"));
    } catch {
      return null;
    }
    for (const file of files) {
      const planId = file.replace(/\.json$/, "");
      if (!SAFE_ID_RE.test(planId)) continue;
      const store = await this.read(planId);
      if (store[id]) return store[id];
    }
    return null;
  }

  async create(input: CreateCalibrationInput): Promise<Calibration> {
    assertSafeId(input.planId);
    const normDist = normalizedDistance(input.normalizedStart, input.normalizedEnd);
    const pageUnitsPerMillimeter = normDist / input.knownDistanceMillimeters;
    const now = new Date().toISOString();
    const id = randomUUID();

    const calibration: Calibration = {
      ...input,
      id,
      pageUnitsPerMillimeter,
      revision: 1,
      createdBy: input.createdBy ?? { name: "System" },
      createdAt: now,
      updatedAt: now,
    };

    return withLock(cLocks, input.planId, async () => {
      const store = await this.read(input.planId);
      store[id] = calibration;
      await this.write(input.planId, store);
      return calibration;
    });
  }

  async update(id: string, input: UpdateCalibrationInput, expectedRevision: number): Promise<Calibration> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    assertSafeId(existing.planId);
    return withLock(cLocks, existing.planId, async () => {
      const store = await this.read(existing.planId);
      const c = store[id];
      if (!c) throw new NotFoundError(id);
      if (c.revision !== expectedRevision) throw new ConflictError(c.revision);

      const updated: Calibration = {
        ...c,
        ...input,
        id,
        planId: c.planId,
        revision: c.revision + 1,
        updatedAt: new Date().toISOString(),
      };

      // Recompute pageUnitsPerMillimeter if start/end/distance changed
      const start = input.normalizedStart ?? c.normalizedStart;
      const end = input.normalizedEnd ?? c.normalizedEnd;
      const dist = input.knownDistanceMillimeters ?? c.knownDistanceMillimeters;
      const normDist = normalizedDistance(start, end);
      updated.pageUnitsPerMillimeter = normDist / dist;

      store[id] = updated;
      await this.write(existing.planId, store);
      return updated;
    });
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    assertSafeId(existing.planId);
    return withLock(cLocks, existing.planId, async () => {
      const store = await this.read(existing.planId);
      const c = store[id];
      if (!c) throw new NotFoundError(id);
      if (c.revision !== expectedRevision) throw new ConflictError(c.revision);
      delete store[id];
      await this.write(existing.planId, store);
    });
  }
}

// ─── Local Group Repository (stored inside measurement JSON) ──────────────────
export class LocalGroupRepository implements MeasurementGroupRepository {
  private readonly root: string;

  constructor(root?: string) {
    this.root = root ?? defaultMeasurementRoot();
  }

  private file(planId: string): string {
    return path.join(this.root, `${planId}.json`);
  }

  private async read(planId: string): Promise<MeasurementStore> {
    return readJson<MeasurementStore>(this.file(planId), { measurements: {}, groups: {} });
  }

  private async write(planId: string, store: MeasurementStore): Promise<void> {
    await writeJson(this.file(planId), store);
  }

  async list(planId: string): Promise<MeasurementGroup[]> {
    assertSafeId(planId);
    const store = await this.read(planId);
    return Object.values(store.groups);
  }

  async get(id: string): Promise<MeasurementGroup | null> {
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try {
      files = readdirSync(this.root).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp"));
    } catch {
      return null;
    }
    for (const file of files) {
      const planId = file.replace(/\.json$/, "");
      if (!SAFE_ID_RE.test(planId)) continue;
      const store = await this.read(planId);
      if (store.groups[id]) return store.groups[id];
    }
    return null;
  }

  async create(input: CreateGroupInput): Promise<MeasurementGroup> {
    assertSafeId(input.planId);
    const now = new Date().toISOString();
    const id = randomUUID();
    const group: MeasurementGroup = { ...input, id, createdAt: now, updatedAt: now };
    return withLock(mLocks, input.planId, async () => {
      const store = await this.read(input.planId);
      store.groups[id] = group;
      await this.write(input.planId, store);
      return group;
    });
  }

  async update(id: string, input: UpdateGroupInput): Promise<MeasurementGroup> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    assertSafeId(existing.planId);
    return withLock(mLocks, existing.planId, async () => {
      const store = await this.read(existing.planId);
      const g = store.groups[id];
      if (!g) throw new NotFoundError(id);
      const updated: MeasurementGroup = { ...g, ...input, updatedAt: new Date().toISOString() };
      store.groups[id] = updated;
      await this.write(existing.planId, store);
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    assertSafeId(existing.planId);
    return withLock(mLocks, existing.planId, async () => {
      const store = await this.read(existing.planId);
      if (!store.groups[id]) throw new NotFoundError(id);
      delete store.groups[id];
      await this.write(existing.planId, store);
    });
  }
}
