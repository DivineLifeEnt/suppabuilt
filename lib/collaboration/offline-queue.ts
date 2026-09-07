"use client";

import { openDB, type IDBPDatabase } from "idb";

export type QueuedOperation = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  expectedRevision: number;
  operation: "create" | "update" | "delete" | "batch";
  payload: unknown;
  idempotencyKey: string;
  dependencies: string[];
  timestamp: string;
  retryCount: number;
};

export type ReplayResult = {
  succeeded: string[];
  failed: Array<{ id: string; reason: string; requiresUserAction: boolean }>;
};

const DB_NAME = "suppabuilt-offline-queue";
const STORE_NAME = "operations";
const MAX_OPS = 500;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
}

export class OfflineQueue {
  async enqueue(
    op: Omit<QueuedOperation, "id" | "timestamp" | "retryCount">
  ): Promise<string> {
    const db = await getDb();
    const all = await db.getAll(STORE_NAME) as QueuedOperation[];
    if (all.length >= MAX_OPS) {
      throw new Error("Offline queue full (max 500 operations)");
    }
    const id = crypto.randomUUID();
    const item: QueuedOperation = {
      ...op,
      id,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    await db.put(STORE_NAME, item);
    return id;
  }

  async list(): Promise<QueuedOperation[]> {
    const db = await getDb();
    const all = await db.getAll(STORE_NAME) as QueuedOperation[];
    const cutoff = Date.now() - MAX_AGE_MS;
    return all.filter((op) => new Date(op.timestamp).getTime() > cutoff);
  }

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
  }

  async clear(): Promise<void> {
    const db = await getDb();
    await db.clear(STORE_NAME);
  }

  async replay(executor: (op: QueuedOperation) => Promise<void>): Promise<ReplayResult> {
    const ops = await this.list();
    const succeeded: string[] = [];
    const failed: ReplayResult["failed"] = [];

    // Topological ordering: process ops with no pending dependencies first
    const remaining = [...ops];
    const succeededSet = new Set<string>();

    let progressed = true;
    while (progressed && remaining.length > 0) {
      progressed = false;
      for (let i = remaining.length - 1; i >= 0; i--) {
        const op = remaining[i];
        const depsOk = op.dependencies.every((d) => succeededSet.has(d));
        if (!depsOk) continue;

        try {
          await executor(op);
          succeededSet.add(op.id);
          succeeded.push(op.id);
          await this.remove(op.id);
          remaining.splice(i, 1);
          progressed = true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const requiresUserAction = msg.includes("401") || msg.includes("403") || msg.includes("CONFLICT");
          failed.push({ id: op.id, reason: msg, requiresUserAction });
          remaining.splice(i, 1);
          progressed = true;
          if (requiresUserAction) {
            // Stop on auth errors
            break;
          }
        }
      }
    }

    // Anything left had unresolved dependencies that failed
    for (const op of remaining) {
      failed.push({ id: op.id, reason: "Dependency failed", requiresUserAction: false });
    }

    return { succeeded, failed };
  }
}
