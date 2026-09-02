/**
 * Prisma-backed markup repository.
 * Only instantiated when DATABASE_URL is set (production).
 * Uses dynamic require to avoid bundling issues in dev.
 */
import type {
  Markup,
  CreateMarkupInput,
  UpdateMarkupInput,
  MarkupBatchInput,
  MarkupBatchResult,
  BatchResultItem,
  MarkupStyle,
} from "@/lib/markup/types";
import {
  type MarkupRepository,
  ConflictError,
  NotFoundError,
} from "./markup-repository";

// ─── Minimal Prisma type surface we actually use ──────────────────────────────
type DbRow = {
  id: string;
  planId: string;
  pageNumber: number;
  tool: string;
  geometryJson: string;
  styleJson: string;
  status: string;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  label: string | null;
  comment: string | null;
  authorName: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

type PlanMarkupDelegate = {
  findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<DbRow[]>;
  findUnique(args: { where: { id: string } }): Promise<DbRow | null>;
  create(args: { data: Record<string, unknown> }): Promise<DbRow>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<DbRow>;
  delete(args: { where: { id: string } }): Promise<DbRow>;
};

type TxClient = {
  planMarkup: PlanMarkupDelegate;
};

type AnyPrisma = {
  planMarkup: PlanMarkupDelegate;
  $transaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T>;
};

// ─── Lazy singleton ───────────────────────────────────────────────────────────
let _prisma: AnyPrisma | null = null;

function getPrisma(): AnyPrisma {
  if (!_prisma) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("@prisma/client") as { PrismaClient: new () => AnyPrisma };
    _prisma = new PrismaClient();
  }
  return _prisma;
}

// ─── DB row → Markup ──────────────────────────────────────────────────────────
function rowToMarkup(row: DbRow): Markup {
  const geometry = JSON.parse(row.geometryJson) as Record<string, unknown>;
  const style = JSON.parse(row.styleJson) as MarkupStyle;

  const base = {
    id: row.id,
    planId: row.planId,
    pageNumber: row.pageNumber,
    tool: row.tool,
    style,
    status: row.status as Markup["status"],
    locked: row.locked,
    visible: row.visible,
    zIndex: row.zIndex,
    label: row.label,
    comment: row.comment,
    authorName: row.authorName,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  return { ...base, ...geometry } as Markup;
}

function buildGeometryJson(input: CreateMarkupInput | UpdateMarkupInput): string {
  const geom: Record<string, unknown> = {};
  const inp = input as Record<string, unknown>;
  if (inp["kind"] != null) geom["kind"] = inp["kind"];
  if (inp["bounds"] != null) geom["bounds"] = inp["bounds"];
  if (inp["points"] != null) geom["points"] = inp["points"];
  if (inp["start"] != null) geom["start"] = inp["start"];
  if (inp["end"] != null) geom["end"] = inp["end"];
  if (inp["point"] != null) geom["point"] = inp["point"];
  if (inp["text"] != null) geom["text"] = inp["text"];
  return JSON.stringify(geom);
}

// ─── Repository ───────────────────────────────────────────────────────────────
export class PrismaMarkupRepository implements MarkupRepository {
  private get db(): AnyPrisma {
    return getPrisma();
  }

  async list(planId: string, pageNumber?: number): Promise<Markup[]> {
    const rows = await this.db.planMarkup.findMany({
      where: {
        planId,
        ...(pageNumber != null ? { pageNumber } : {}),
      },
      orderBy: { zIndex: "asc" },
    });
    return rows.map(rowToMarkup);
  }

  async get(id: string): Promise<Markup | null> {
    const row = await this.db.planMarkup.findUnique({ where: { id } });
    return row ? rowToMarkup(row) : null;
  }

  async create(input: CreateMarkupInput): Promise<Markup> {
    const geometryJson = buildGeometryJson(input);
    const row = await this.db.planMarkup.create({
      data: {
        planId: input.planId,
        pageNumber: input.pageNumber,
        tool: input.tool,
        geometryJson,
        styleJson: JSON.stringify(input.style),
        status: input.status,
        locked: input.locked,
        visible: input.visible,
        zIndex: input.zIndex,
        label: input.label,
        comment: input.comment,
        authorName: input.authorName,
        revision: 1,
      },
    });
    return rowToMarkup(row);
  }

  async update(
    id: string,
    input: UpdateMarkupInput,
    expectedRevision: number
  ): Promise<Markup> {
    const existing = await this.db.planMarkup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision)
      throw new ConflictError(id, expectedRevision, existing.revision);

    const existingGeom = JSON.parse(existing.geometryJson) as Record<string, unknown>;
    const newGeom = JSON.parse(buildGeometryJson(input)) as Record<string, unknown>;
    const mergedGeom = { ...existingGeom, ...newGeom };

    const existingStyle = JSON.parse(existing.styleJson) as MarkupStyle;
    const mergedStyle = input.style ? { ...existingStyle, ...input.style } : existingStyle;

    const row = await this.db.planMarkup.update({
      where: { id },
      data: {
        geometryJson: JSON.stringify(mergedGeom),
        styleJson: JSON.stringify(mergedStyle),
        ...(input.status != null ? { status: input.status } : {}),
        ...(input.locked != null ? { locked: input.locked } : {}),
        ...(input.visible != null ? { visible: input.visible } : {}),
        ...(input.zIndex != null ? { zIndex: input.zIndex } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.comment !== undefined ? { comment: input.comment } : {}),
        ...(input.authorName != null ? { authorName: input.authorName } : {}),
        revision: existing.revision + 1,
      },
    });
    return rowToMarkup(row);
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.db.planMarkup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision)
      throw new ConflictError(id, expectedRevision, existing.revision);
    await this.db.planMarkup.delete({ where: { id } });
  }

  async batch(
    _planId: string,
    { items }: MarkupBatchInput
  ): Promise<MarkupBatchResult> {
    const results: BatchResultItem[] = [];

    await this.db.$transaction(async (tx: TxClient) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          if (item.op === "create") {
            const geometryJson = buildGeometryJson(item.input);
            const row = await tx.planMarkup.create({
              data: {
                planId: item.input.planId,
                pageNumber: item.input.pageNumber,
                tool: item.input.tool,
                geometryJson,
                styleJson: JSON.stringify(item.input.style),
                status: item.input.status,
                locked: item.input.locked,
                visible: item.input.visible,
                zIndex: item.input.zIndex,
                label: item.input.label,
                comment: item.input.comment,
                authorName: item.input.authorName,
                revision: 1,
              },
            });
            results.push({ op: "create", markup: rowToMarkup(row) });
          } else if (item.op === "update") {
            const existing = await tx.planMarkup.findUnique({ where: { id: item.id } });
            if (!existing) throw new NotFoundError(item.id);
            if (existing.revision !== item.expectedRevision)
              throw new ConflictError(item.id, item.expectedRevision, existing.revision);

            const existingGeom = JSON.parse(existing.geometryJson) as Record<string, unknown>;
            const newGeom = JSON.parse(buildGeometryJson(item.input)) as Record<string, unknown>;
            const mergedGeom = { ...existingGeom, ...newGeom };
            const existingStyle = JSON.parse(existing.styleJson) as MarkupStyle;
            const mergedStyle = item.input.style ? { ...existingStyle, ...item.input.style } : existingStyle;

            const row = await tx.planMarkup.update({
              where: { id: item.id },
              data: {
                geometryJson: JSON.stringify(mergedGeom),
                styleJson: JSON.stringify(mergedStyle),
                ...(item.input.status != null ? { status: item.input.status } : {}),
                ...(item.input.locked != null ? { locked: item.input.locked } : {}),
                ...(item.input.visible != null ? { visible: item.input.visible } : {}),
                ...(item.input.zIndex != null ? { zIndex: item.input.zIndex } : {}),
                ...(item.input.label !== undefined ? { label: item.input.label } : {}),
                ...(item.input.comment !== undefined ? { comment: item.input.comment } : {}),
                ...(item.input.authorName != null ? { authorName: item.input.authorName } : {}),
                revision: existing.revision + 1,
              },
            });
            results.push({ op: "update", markup: rowToMarkup(row) });
          } else if (item.op === "delete") {
            const existing = await tx.planMarkup.findUnique({ where: { id: item.id } });
            if (!existing) throw new NotFoundError(item.id);
            if (existing.revision !== item.expectedRevision)
              throw new ConflictError(item.id, item.expectedRevision, existing.revision);
            await tx.planMarkup.delete({ where: { id: item.id } });
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
          throw err; // rollback
        }
      }
    });

    return { results };
  }
}
