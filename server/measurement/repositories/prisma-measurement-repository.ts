/**
 * Prisma-backed measurement repository.
 * Duck-typed Prisma client for typecheck compatibility without requiring generated client.
 */
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

// ─── Duck-typed Prisma client ─────────────────────────────────────────────────

type PrismaCalibrationRow = {
  id: string;
  planId: string;
  pageNumber: number | null;
  name: string;
  normalizedStartJson: string;
  normalizedEndJson: string;
  knownDistanceMillimeters: number;
  pageUnitsPerMillimeter: number;
  unitSystem: string;
  displayUnit: string;
  precision: number;
  architecturalDenominator: number | null;
  authorName: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaMeasurementRow = {
  id: string;
  planId: string;
  pageNumber: number;
  type: string;
  calibrationId: string | null;
  geometryJson: string;
  styleJson: string;
  label: string | null;
  prefix: string | null;
  suffix: string | null;
  status: string;
  locked: boolean;
  visible: boolean;
  groupId: string | null;
  zIndex: number;
  authorName: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaGroupRow = {
  id: string;
  planId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

interface PrismaMeasurementModel {
  findMany(args: { where: Record<string, unknown> }): Promise<PrismaMeasurementRow[]>;
  findUnique(args: { where: { id: string } }): Promise<PrismaMeasurementRow | null>;
  create(args: { data: Record<string, unknown> }): Promise<PrismaMeasurementRow>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<PrismaMeasurementRow>;
  delete(args: { where: { id: string } }): Promise<PrismaMeasurementRow>;
}

interface PrismaCalibrationModel {
  findMany(args: { where: Record<string, unknown> }): Promise<PrismaCalibrationRow[]>;
  findUnique(args: { where: { id: string } }): Promise<PrismaCalibrationRow | null>;
  create(args: { data: Record<string, unknown> }): Promise<PrismaCalibrationRow>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<PrismaCalibrationRow>;
  delete(args: { where: { id: string } }): Promise<PrismaCalibrationRow>;
}

interface PrismaGroupModel {
  findMany(args: { where: Record<string, unknown> }): Promise<PrismaGroupRow[]>;
  findUnique(args: { where: { id: string } }): Promise<PrismaGroupRow | null>;
  create(args: { data: Record<string, unknown> }): Promise<PrismaGroupRow>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<PrismaGroupRow>;
  delete(args: { where: { id: string } }): Promise<PrismaGroupRow>;
}

export interface DuckPrismaClient {
  planMeasurement: PrismaMeasurementModel;
  measurementCalibration: PrismaCalibrationModel;
  measurementGroup: PrismaGroupModel;
}

// ─── Row → Domain converters ──────────────────────────────────────────────────

function rowToCalibration(row: PrismaCalibrationRow): Calibration {
  return {
    id: row.id,
    planId: row.planId,
    pageNumber: row.pageNumber,
    name: row.name,
    normalizedStart: JSON.parse(row.normalizedStartJson) as { x: number; y: number },
    normalizedEnd: JSON.parse(row.normalizedEndJson) as { x: number; y: number },
    knownDistanceMillimeters: row.knownDistanceMillimeters,
    pageUnitsPerMillimeter: row.pageUnitsPerMillimeter,
    unitSystem: row.unitSystem as Calibration["unitSystem"],
    displayUnit: row.displayUnit as Calibration["displayUnit"],
    precision: row.precision,
    architecturalDenominator: row.architecturalDenominator != null
      ? (row.architecturalDenominator as Calibration["architecturalDenominator"])
      : undefined,
    revision: row.revision,
    createdBy: { name: row.authorName },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowToMeasurement(row: PrismaMeasurementRow): Measurement {
  const geometry = JSON.parse(row.geometryJson) as Record<string, unknown>;
  const style = JSON.parse(row.styleJson) as Measurement["style"];

  const base = {
    id: row.id,
    planId: row.planId,
    pageNumber: row.pageNumber,
    calibrationId: row.calibrationId,
    label: row.label,
    prefix: row.prefix,
    suffix: row.suffix,
    style,
    locked: row.locked,
    visible: row.visible,
    status: row.status as "open" | "resolved",
    groupId: row.groupId,
    zIndex: row.zIndex,
    revision: row.revision,
    createdBy: { name: row.authorName },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  return { ...base, ...geometry } as Measurement;
}

function rowToGroup(row: PrismaGroupRow): MeasurementGroup {
  return {
    id: row.id,
    planId: row.planId,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function measurementToGeometryJson(input: CreateMeasurementInput): string {
  const { planId: _p, pageNumber: _n, calibrationId: _c, label: _l,
    prefix: _pr, suffix: _s, style: _st, locked: _lo, visible: _v,
    status: _st2, groupId: _g, zIndex: _z, createdBy: _cb, ...geometry } = input;
  return JSON.stringify(geometry);
}

const SYSTEM_AUTHOR: MeasurementAuthor = { name: "System" };

// ─── Prisma Measurement Repository ───────────────────────────────────────────
export class PrismaMeasurementRepository implements MeasurementRepository {
  constructor(private readonly prisma: DuckPrismaClient) {}

  async list(planId: string, pageNumber?: number, type?: string, groupId?: string): Promise<Measurement[]> {
    const where: Record<string, unknown> = { planId };
    if (pageNumber != null) where.pageNumber = pageNumber;
    if (type) where.type = type;
    if (groupId) where.groupId = groupId;
    const rows = await this.prisma.planMeasurement.findMany({ where });
    return rows.map(rowToMeasurement);
  }

  async get(id: string): Promise<Measurement | null> {
    const row = await this.prisma.planMeasurement.findUnique({ where: { id } });
    return row ? rowToMeasurement(row) : null;
  }

  async create(input: CreateMeasurementInput): Promise<Measurement> {
    const geometryJson = measurementToGeometryJson(input);
    const row = await this.prisma.planMeasurement.create({
      data: {
        id: randomUUID(),
        planId: input.planId,
        pageNumber: input.pageNumber,
        type: input.type,
        calibrationId: input.calibrationId,
        geometryJson,
        styleJson: JSON.stringify(input.style),
        label: input.label,
        prefix: input.prefix,
        suffix: input.suffix,
        status: input.status,
        locked: input.locked,
        visible: input.visible,
        groupId: input.groupId,
        zIndex: input.zIndex,
        authorName: (input.createdBy ?? SYSTEM_AUTHOR).name,
        revision: 1,
      },
    });
    return rowToMeasurement(row);
  }

  async update(id: string, input: UpdateMeasurementInput, expectedRevision: number): Promise<Measurement> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(existing.revision);

    const updateData: Record<string, unknown> = {
      revision: { increment: 1 },
    };

    if (input.label !== undefined) updateData.label = input.label;
    if (input.prefix !== undefined) updateData.prefix = input.prefix;
    if (input.suffix !== undefined) updateData.suffix = input.suffix;
    if (input.locked != null) updateData.locked = input.locked;
    if (input.visible != null) updateData.visible = input.visible;
    if (input.status != null) updateData.status = input.status;
    if (input.groupId !== undefined) updateData.groupId = input.groupId;
    if (input.zIndex != null) updateData.zIndex = input.zIndex;
    if (input.style != null) {
      updateData.styleJson = JSON.stringify({ ...existing.style, ...input.style });
    }

    // Rebuild geometryJson if any geometry field changed
    const geoFields = ["start", "end", "points", "center", "edge", "vertex", "geometry", "depthMillimeters", "displayUnit", "precision"] as const;
    const geoChanged = geoFields.some((k) => k in input && input[k] !== undefined);
    if (geoChanged) {
      const merged = { ...existing, ...input };
      updateData.geometryJson = measurementToGeometryJson(merged as CreateMeasurementInput);
    }

    const row = await this.prisma.planMeasurement.update({
      where: { id },
      data: updateData,
    });
    return rowToMeasurement(row);
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(existing.revision);
    await this.prisma.planMeasurement.delete({ where: { id } });
  }

  async batch(planId: string, { items }: MeasurementBatchInput): Promise<MeasurementBatchResult> {
    const results: MeasurementBatchResultItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (item.op === "create") {
          const m = await this.create({ ...item.input, planId });
          results.push({ op: "create", measurement: m });
        } else if (item.op === "update") {
          const m = await this.update(item.id, item.input, item.expectedRevision);
          results.push({ op: "update", measurement: m });
        } else if (item.op === "delete") {
          await this.delete(item.id, item.expectedRevision);
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

    return { results };
  }
}

// ─── Prisma Calibration Repository ───────────────────────────────────────────
export class PrismaCalibrationRepository implements CalibrationRepository {
  constructor(private readonly prisma: DuckPrismaClient) {}

  async list(planId: string, pageNumber?: number): Promise<Calibration[]> {
    const where: Record<string, unknown> = { planId };
    if (pageNumber != null) where.pageNumber = pageNumber;
    const rows = await this.prisma.measurementCalibration.findMany({ where });
    return rows.map(rowToCalibration);
  }

  async get(id: string): Promise<Calibration | null> {
    const row = await this.prisma.measurementCalibration.findUnique({ where: { id } });
    return row ? rowToCalibration(row) : null;
  }

  async create(input: CreateCalibrationInput): Promise<Calibration> {
    const normDist = normalizedDistance(input.normalizedStart, input.normalizedEnd);
    const pageUnitsPerMillimeter = normDist / input.knownDistanceMillimeters;

    const row = await this.prisma.measurementCalibration.create({
      data: {
        id: randomUUID(),
        planId: input.planId,
        pageNumber: input.pageNumber ?? null,
        name: input.name,
        normalizedStartJson: JSON.stringify(input.normalizedStart),
        normalizedEndJson: JSON.stringify(input.normalizedEnd),
        knownDistanceMillimeters: input.knownDistanceMillimeters,
        pageUnitsPerMillimeter,
        unitSystem: input.unitSystem,
        displayUnit: input.displayUnit,
        precision: input.precision,
        architecturalDenominator: input.architecturalDenominator ?? null,
        authorName: (input.createdBy ?? SYSTEM_AUTHOR).name,
        revision: 1,
      },
    });
    return rowToCalibration(row);
  }

  async update(id: string, input: UpdateCalibrationInput, expectedRevision: number): Promise<Calibration> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(existing.revision);

    const start = input.normalizedStart ?? existing.normalizedStart;
    const end = input.normalizedEnd ?? existing.normalizedEnd;
    const dist = input.knownDistanceMillimeters ?? existing.knownDistanceMillimeters;
    const normDist = normalizedDistance(start, end);
    const pageUnitsPerMillimeter = normDist / dist;

    const data: Record<string, unknown> = {
      pageUnitsPerMillimeter,
      revision: { increment: 1 },
    };
    if (input.name != null) data.name = input.name;
    if (input.pageNumber !== undefined) data.pageNumber = input.pageNumber;
    if (input.normalizedStart != null) data.normalizedStartJson = JSON.stringify(input.normalizedStart);
    if (input.normalizedEnd != null) data.normalizedEndJson = JSON.stringify(input.normalizedEnd);
    if (input.knownDistanceMillimeters != null) data.knownDistanceMillimeters = input.knownDistanceMillimeters;
    if (input.unitSystem != null) data.unitSystem = input.unitSystem;
    if (input.displayUnit != null) data.displayUnit = input.displayUnit;
    if (input.precision != null) data.precision = input.precision;
    if (input.architecturalDenominator !== undefined) data.architecturalDenominator = input.architecturalDenominator ?? null;

    const row = await this.prisma.measurementCalibration.update({ where: { id }, data });
    return rowToCalibration(row);
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    if (existing.revision !== expectedRevision) throw new ConflictError(existing.revision);
    await this.prisma.measurementCalibration.delete({ where: { id } });
  }
}

// ─── Prisma Group Repository ──────────────────────────────────────────────────
export class PrismaGroupRepository implements MeasurementGroupRepository {
  constructor(private readonly prisma: DuckPrismaClient) {}

  async list(planId: string): Promise<MeasurementGroup[]> {
    const rows = await this.prisma.measurementGroup.findMany({ where: { planId } });
    return rows.map(rowToGroup);
  }

  async get(id: string): Promise<MeasurementGroup | null> {
    const row = await this.prisma.measurementGroup.findUnique({ where: { id } });
    return row ? rowToGroup(row) : null;
  }

  async create(input: CreateGroupInput): Promise<MeasurementGroup> {
    const row = await this.prisma.measurementGroup.create({
      data: { id: randomUUID(), ...input },
    });
    return rowToGroup(row);
  }

  async update(id: string, input: UpdateGroupInput): Promise<MeasurementGroup> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    const row = await this.prisma.measurementGroup.update({ where: { id }, data: input });
    return rowToGroup(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) throw new NotFoundError(id);
    await this.prisma.measurementGroup.delete({ where: { id } });
  }
}
