import { describe, it, expect, beforeEach, vi } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Mock idb so OfflineQueue runs in jsdom without a real IndexedDB
// ──────────────────────────────────────────────────────────────────────────────
const store = new Map<string, unknown>();

vi.mock("idb", () => {
  const mockDb = {
    getAll: (_storeName: string) => Promise.resolve([...store.values()]),
    put: (_storeName: string, item: { id: string }) => {
      store.set(item.id, item);
      return Promise.resolve();
    },
    delete: (_storeName: string, id: string) => {
      store.delete(id);
      return Promise.resolve();
    },
    clear: (_storeName: string) => {
      store.clear();
      return Promise.resolve();
    },
  };
  return {
    openDB: () => Promise.resolve(mockDb),
  };
});

import { OfflineQueue } from "@/lib/collaboration/offline-queue";
import type { QueuedOperation } from "@/lib/collaboration/offline-queue";

function makeOp(overrides: Partial<Omit<QueuedOperation, "id" | "timestamp" | "retryCount">> = {}): Omit<QueuedOperation, "id" | "timestamp" | "retryCount"> {
  return {
    aggregateType: "markup",
    aggregateId: "markup-1",
    expectedRevision: 0,
    operation: "create",
    payload: { x: 0 },
    idempotencyKey: crypto.randomUUID(),
    dependencies: [],
    ...overrides,
  };
}

describe("OfflineQueue", () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    store.clear();
    queue = new OfflineQueue();
  });

  it("enqueue adds an item and list returns it", async () => {
    await queue.enqueue(makeOp());
    const items = await queue.list();
    expect(items).toHaveLength(1);
    expect(items[0].aggregateType).toBe("markup");
  });

  it("remove deletes the item", async () => {
    const id = await queue.enqueue(makeOp());
    await queue.remove(id);
    const items = await queue.list();
    expect(items).toHaveLength(0);
  });

  it("respects MAX_OPS=500 limit — throws on 501st enqueue", async () => {
    // Fill the store with 500 fake items
    for (let i = 0; i < 500; i++) {
      store.set(`fake-${i}`, {
        id: `fake-${i}`,
        aggregateType: "markup",
        aggregateId: "x",
        expectedRevision: 0,
        operation: "create",
        payload: {},
        idempotencyKey: `idem-${i}`,
        dependencies: [],
        timestamp: new Date().toISOString(),
        retryCount: 0,
      });
    }
    await expect(queue.enqueue(makeOp())).rejects.toThrow(/full/i);
  });

  it("replay calls executor for each operation", async () => {
    await queue.enqueue(makeOp({ aggregateId: "a", dependencies: [] }));
    await queue.enqueue(makeOp({ aggregateId: "b", dependencies: [] }));

    const executed: string[] = [];
    const executor = vi.fn(async (op: QueuedOperation) => {
      executed.push(op.aggregateId);
    });

    await queue.replay(executor);
    expect(executor).toHaveBeenCalledTimes(2);
    expect(executed).toContain("a");
    expect(executed).toContain("b");
  });
});
