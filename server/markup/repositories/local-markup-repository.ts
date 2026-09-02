import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Markup,
  CreateMarkupInput,
  UpdateMarkupInput,
  MarkupBatchInput,
  MarkupBatchResult,
  BatchResultItem,
} from "@/lib/markup/types";
import {
  type MarkupRepository,
  ConflictError,
  NotFoundError,
} from "./markup-repository";

function getDefaultStorageRoot() {
  return path.join(process.cwd(), "storage", "markups");
}

// UUID v4 validation — prevents path traversal
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function planFile(storageRoot: string, planId: string): string {
  return path.join(storageRoot, `${planId}.json`);
}

function assertUuid(id: string, label = "planId"): void {
  if (!UUID_RE.test(id)) throw new Error(`Invalid ${label}: ${id}`);
}

// ─── In-memory map keyed by planId to avoid concurrent write races ────────────
// (fine for dev / single-process; Prisma repo handles production concurrency)
const locks = new Map<string, Promise<void>>();

async function withLock<T>(planId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(planId) ?? Promise.resolve();
  let resolve!: () => void;
  const next = new Promise<void>((r) => { resolve = r; });
  locks.set(planId, next);
  try {
    await prev;
    return await fn();
  } finally {
    resolve();
    if (locks.get(planId) === next) locks.delete(planId);
  }
}

type Store = Record<string, Markup>;

async function readStore(storageRoot: string, planId: string): Promise<Store> {
  const file = planFile(storageRoot, planId);
  if (!existsSync(file)) return {};
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

async function writeStore(storageRoot: string, planId: string, store: Store): Promise<void> {
  await mkdir(storageRoot, { recursive: true });
  const file = planFile(storageRoot, planId);
  const tmp = `${file}.tmp-${Date.now()}`;
  await writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await rename(tmp, file);
}

// ─── Helpers to convert CreateMarkupInput → Markup ───────────────────────────

function buildMarkup(input: CreateMarkupInput, id: string): Markup {
  const now = new Date().toISOString();
  return {
    ...input,
    id,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  } as Markup;
}

function applyUpdate(existing: Markup, input: UpdateMarkupInput): Markup {
  const now = new Date().toISOString();
  const m = { ...existing, updatedAt: now, revision: existing.revision + 1 };

  if (input.style != null) m.style = { ...m.style, ...input.style };
  if (input.status != null) m.status = input.status;
  if (input.locked != null) m.locked = input.locked;
  if (input.visible != null) m.visible = input.visible;
  if (input.zIndex != null) m.zIndex = input.zIndex;
  if (input.label !== undefined) m.label = input.label ?? null;
  if (input.comment !== undefined) m.comment = input.comment ?? null;
  if (input.authorName != null) m.authorName = input.authorName;

  // geometry patches
  if (m.kind === "bounds" && input.bounds) {
    (m as { bounds: typeof input.bounds }).bounds = input.bounds;
  }
  if (m.kind === "path" && input.points) {
    (m as { points: typeof input.points }).points = input.points!;
  }
  if (m.kind === "line") {
    if (input.start) (m as { start: typeof input.start }).start = input.start;
    if (input.end) (m as { end: typeof input.end }).end = input.end;
  }
  if (m.kind === "point" && input.point) {
    (m as { point: typeof input.point }).point = input.point;
  }
  if (m.kind === "text") {
    if (input.point) (m as { point: typeof input.point }).point = input.point;
    if (input.text != null) (m as { text: string }).text = input.text;
  }

  return m as Markup;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class LocalMarkupRepository implements MarkupRepository {
  private readonly storageRoot: string;

  constructor(storageRoot?: string) {
    this.storageRoot = storageRoot ?? getDefaultStorageRoot();
  }

  async list(planId: string, pageNumber?: number): Promise<Markup[]> {
    assertUuid(planId);
    const store = await readStore(this.storageRoot, planId);
    const all = Object.values(store);
    return pageNumber != null
      ? all.filter((m) => m.pageNumber === pageNumber)
      : all;
  }

  async get(id: string): Promise<Markup | null> {
    const { readdirSync } = await import("node:fs");
    let files: string[] = [];
    try {
      files = readdirSync(this.storageRoot).filter((f: string) => f.endsWith(".json") && !f.includes(".tmp"));
    } catch {
      return null;
    }
    for (const file of files) {
      const planId = file.replace(/\.json$/, "");
      if (!UUID_RE.test(planId)) continue;
      const store = await readStore(this.storageRoot, planId);
      if (store[id]) return store[id];
    }
    return null;
  }

  async create(input: CreateMarkupInput): Promise<Markup> {
    assertUuid(input.planId);
    const root = this.storageRoot;
    return withLock(input.planId, async () => {
      const store = await readStore(root, input.planId);
      const id = randomUUID();
      const markup = buildMarkup(input, id);
      store[id] = markup;
      await writeStore(root, input.planId, store);
      return markup;
    });
  }

  async update(
    id: string,
    input: UpdateMarkupInput,
    expectedRevision: number
  ): Promise<Markup> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);

    assertUuid(existing.planId);
    const root = this.storageRoot;
    return withLock(existing.planId, async () => {
      const store = await readStore(root, existing.planId);
      const m = store[id];
      if (!m) throw new NotFoundError(id);
      if (m.revision !== expectedRevision)
        throw new ConflictError(id, expectedRevision, m.revision);
      const updated = applyUpdate(m, input);
      store[id] = updated;
      await writeStore(root, existing.planId, store);
      return updated;
    });
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);

    assertUuid(existing.planId);
    const root = this.storageRoot;
    return withLock(existing.planId, async () => {
      const store = await readStore(root, existing.planId);
      const m = store[id];
      if (!m) throw new NotFoundError(id);
      if (m.revision !== expectedRevision)
        throw new ConflictError(id, expectedRevision, m.revision);
      delete store[id];
      await writeStore(root, existing.planId, store);
    });
  }

  async batch(
    planId: string,
    { items }: MarkupBatchInput
  ): Promise<MarkupBatchResult> {
    assertUuid(planId);
    const root = this.storageRoot;
    return withLock(planId, async () => {
      const store = await readStore(root, planId);
      const results: BatchResultItem[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          if (item.op === "create") {
            const id = randomUUID();
            const markup = buildMarkup(item.input, id);
            store[id] = markup;
            results.push({ op: "create", markup });
          } else if (item.op === "update") {
            const m = store[item.id];
            if (!m) throw new NotFoundError(item.id);
            if (m.revision !== item.expectedRevision)
              throw new ConflictError(item.id, item.expectedRevision, m.revision);
            const updated = applyUpdate(m, item.input);
            store[item.id] = updated;
            results.push({ op: "update", markup: updated });
          } else if (item.op === "delete") {
            const m = store[item.id];
            if (!m) throw new NotFoundError(item.id);
            if (m.revision !== item.expectedRevision)
              throw new ConflictError(item.id, item.expectedRevision, m.revision);
            delete store[item.id];
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

      await writeStore(root, planId, store);
      return { results };
    });
  }
}
