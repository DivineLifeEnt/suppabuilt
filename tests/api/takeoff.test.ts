import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  LocalCatalogRepository,
  LocalTakeoffItemRepository,
  LocalProjectSystemRepository,
  ConflictError,
  NotFoundError,
} from "@/server/takeoff/repositories/index";
import type { CreateCatalogInput, CreateTakeoffInput } from "@/lib/takeoff/types";

const ORG_ID = "test-org";
const PLAN_ID = "plan-0001";

let tmpDir: string;
let catalog: LocalCatalogRepository;
let takeoffItems: LocalTakeoffItemRepository;
let systems: LocalProjectSystemRepository;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "takeoff-test-"));
  catalog = new LocalCatalogRepository(tmpDir);
  takeoffItems = new LocalTakeoffItemRepository(tmpDir);
  systems = new LocalProjectSystemRepository(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const catalogInput: CreateCatalogInput = {
  organizationId: ORG_ID, category: "equipment", name: "Test AHU",
  abbreviation: "AHU", description: null, active: true, defaultUnit: "each",
  defaultColor: "#ff6a1a", defaultSymbol: null, keywords: ["ahu"], sortOrder: 0,
  createdBy: { name: "Test" },
};

describe("LocalCatalogRepository — CRUD", () => {
  it("creates and retrieves a catalog item", async () => {
    const item = await catalog.create(catalogInput);
    expect(item.id).toBeTruthy();
    expect(item.revision).toBe(1);
    expect(item.name).toBe("Test AHU");

    const fetched = await catalog.get(item.id);
    expect(fetched?.name).toBe("Test AHU");
  });

  it("lists by organizationId", async () => {
    await catalog.create(catalogInput);
    const items = await catalog.list(ORG_ID);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].organizationId).toBe(ORG_ID);
  });

  it("updates with expectedRevision", async () => {
    const item = await catalog.create(catalogInput);
    const updated = await catalog.update(item.id, { name: "AHU Updated" }, 1);
    expect(updated.name).toBe("AHU Updated");
    expect(updated.revision).toBe(2);
  });

  it("throws ConflictError on stale revision", async () => {
    const item = await catalog.create(catalogInput);
    await catalog.update(item.id, { name: "First" }, 1);
    await expect(catalog.update(item.id, { name: "Second" }, 1)).rejects.toThrow(ConflictError);
  });

  it("returns null for missing id", async () => {
    const result = await catalog.get("nonexistent");
    expect(result).toBeNull();
  });

  it("throws NotFoundError when deleting missing id", async () => {
    await expect(catalog.delete("nonexistent", 1)).rejects.toThrow(NotFoundError);
  });

  it("deletes an item", async () => {
    const item = await catalog.create(catalogInput);
    await catalog.delete(item.id, 1);
    expect(await catalog.get(item.id)).toBeNull();
  });
});

const takeoffInput: CreateTakeoffInput = {
  planId: PLAN_ID, pageNumber: 1, catalogItemId: "cat1",
  source: { kind: "manual" }, unit: "each",
  netQuantity: "2", wastePercent: "5",
  equipmentTag: null, size: null, material: null,
  systemId: null, zoneId: null, levelId: null, phaseId: null, groupId: null,
  notes: null, customFields: {}, status: "open", locked: false, visible: true,
  createdBy: { name: "Test" },
};

describe("LocalTakeoffItemRepository — CRUD", () => {
  it("creates and retrieves a takeoff item", async () => {
    const item = await takeoffItems.create(takeoffInput);
    expect(item.id).toBeTruthy();
    expect(item.revision).toBe(1);
    expect(item.netQuantity).toBe("2");
    const fetched = await takeoffItems.get(item.id);
    expect(fetched?.netQuantity).toBe("2");
  });

  it("lists items for a plan", async () => {
    await takeoffItems.create(takeoffInput);
    await takeoffItems.create({ ...takeoffInput, netQuantity: "3" });
    const items = await takeoffItems.list(PLAN_ID);
    expect(items.length).toBe(2);
  });

  it("updates netQuantity", async () => {
    const item = await takeoffItems.create(takeoffInput);
    const updated = await takeoffItems.update(item.id, { netQuantity: "5" }, 1);
    expect(updated.netQuantity).toBe("5");
    expect(updated.revision).toBe(2);
  });

  it("deletes a takeoff item", async () => {
    const item = await takeoffItems.create(takeoffInput);
    await takeoffItems.delete(item.id, 1);
    expect(await takeoffItems.get(item.id)).toBeNull();
  });

  it("throws ConflictError on stale revision delete", async () => {
    const item = await takeoffItems.create(takeoffInput);
    await takeoffItems.update(item.id, { netQuantity: "3" }, 1);
    await expect(takeoffItems.delete(item.id, 1)).rejects.toThrow(ConflictError);
  });
});

describe("LocalProjectSystemRepository — CRUD", () => {
  it("creates and lists systems", async () => {
    const sys = await systems.create({ planId: PLAN_ID, name: "Supply", color: "#3B82F6" });
    expect(sys.id).toBeTruthy();
    const list = await systems.list(PLAN_ID);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Supply");
  });

  it("updates a system", async () => {
    const sys = await systems.create({ planId: PLAN_ID, name: "Return", color: "#F59E0B" });
    const updated = await systems.update(sys.id, { name: "Return Air" });
    expect(updated.name).toBe("Return Air");
  });

  it("deletes a system", async () => {
    const sys = await systems.create({ planId: PLAN_ID, name: "Exhaust", color: "#EF4444" });
    await systems.delete(sys.id);
    const list = await systems.list(PLAN_ID);
    expect(list).toHaveLength(0);
  });
});
