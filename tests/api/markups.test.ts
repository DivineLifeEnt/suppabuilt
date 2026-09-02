import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalMarkupRepository } from "@/server/markup/repositories/local-markup-repository";
import { ConflictError, NotFoundError } from "@/server/markup/repositories/markup-repository";
import type { CreateMarkupInput } from "@/lib/markup/types";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const validPlanId = "00000000-0000-4000-a000-000000000001";

const baseInput: CreateMarkupInput = {
  planId: validPlanId,
  pageNumber: 1,
  tool: "pin",
  kind: "point",
  point: { x: 0.5, y: 0.5 },
  style: { color: "#EF4444", strokeWidth: 2, opacity: 1, fontSize: 16 },
  status: "open",
  locked: false,
  visible: true,
  zIndex: 0,
  authorName: "System",
  label: null,
  comment: null,
} as CreateMarkupInput;

let tmpDir: string;
let repo: LocalMarkupRepository;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "markup-test-"));
  repo = new LocalMarkupRepository(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("LocalMarkupRepository — create", () => {
  it("creates a markup with revision=1 and generated id", async () => {
    const markup = await repo.create(baseInput);
    expect(markup.id).toBeTruthy();
    expect(markup.revision).toBe(1);
    expect(markup.planId).toBe(validPlanId);
    expect(markup.tool).toBe("pin");
  });

  it("persists and lists markup", async () => {
    await repo.create(baseInput);
    const list = await repo.list(validPlanId);
    expect(list).toHaveLength(1);
  });

  it("filters by pageNumber", async () => {
    await repo.create({ ...baseInput, pageNumber: 1 });
    await repo.create({ ...baseInput, pageNumber: 2 });
    const page1 = await repo.list(validPlanId, 1);
    expect(page1).toHaveLength(1);
    expect(page1[0].pageNumber).toBe(1);
  });
});

describe("LocalMarkupRepository — update", () => {
  it("increments revision on update", async () => {
    const created = await repo.create(baseInput);
    const updated = await repo.update(created.id, { status: "resolved" }, 1);
    expect(updated.revision).toBe(2);
    expect(updated.status).toBe("resolved");
  });

  it("throws ConflictError on wrong expectedRevision", async () => {
    const created = await repo.create(baseInput);
    await expect(repo.update(created.id, { status: "resolved" }, 999)).rejects.toThrow(ConflictError);
  });

  it("throws NotFoundError for unknown id", async () => {
    await expect(repo.update("00000000-0000-4000-a000-000000000999", {}, 1)).rejects.toThrow(NotFoundError);
  });
});

describe("LocalMarkupRepository — delete", () => {
  it("deletes a markup", async () => {
    const created = await repo.create(baseInput);
    await repo.delete(created.id, 1);
    const list = await repo.list(validPlanId);
    expect(list).toHaveLength(0);
  });

  it("throws ConflictError on wrong revision when deleting", async () => {
    const created = await repo.create(baseInput);
    await expect(repo.delete(created.id, 999)).rejects.toThrow(ConflictError);
  });
});

describe("LocalMarkupRepository — batch", () => {
  it("batch create produces markups", async () => {
    const result = await repo.batch(validPlanId, {
      items: [
        { op: "create", input: baseInput },
        { op: "create", input: { ...baseInput, pageNumber: 2 } },
      ],
    });
    const creates = result.results.filter((r) => r.op === "create");
    expect(creates).toHaveLength(2);
    const list = await repo.list(validPlanId);
    expect(list).toHaveLength(2);
  });

  it("batch handles conflict errors without crashing", async () => {
    const created = await repo.create(baseInput);
    const result = await repo.batch(validPlanId, {
      items: [
        { op: "update", id: created.id, input: { status: "resolved" }, expectedRevision: 999 },
      ],
    });
    const errors = result.results.filter((r) => r.op === "error");
    expect(errors).toHaveLength(1);
    const errItem = errors[0];
    if (errItem.op === "error") {
      expect(errItem.code).toBe("CONFLICT");
    }
  });
});

describe("LocalMarkupRepository — path traversal protection", () => {
  it("rejects non-UUID planIds", async () => {
    await expect(repo.list("../../etc/passwd")).rejects.toThrow();
  });

  it("rejects planId with path separators", async () => {
    await expect(repo.list("../evil")).rejects.toThrow();
  });
});
