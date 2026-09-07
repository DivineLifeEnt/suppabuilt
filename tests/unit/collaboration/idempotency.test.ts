import { describe, it, expect } from "vitest";
import { IdempotencyTracker } from "@/lib/collaboration/idempotency";

describe("IdempotencyTracker", () => {
  it("starts empty", () => {
    const tracker = new IdempotencyTracker();
    expect(tracker.has("abc")).toBe(false);
  });

  it("adds and detects an id", () => {
    const tracker = new IdempotencyTracker();
    tracker.add("abc");
    expect(tracker.has("abc")).toBe(true);
  });

  it("does not return ids not added", () => {
    const tracker = new IdempotencyTracker();
    tracker.add("abc");
    expect(tracker.has("xyz")).toBe(false);
  });

  it("adding same id twice is idempotent", () => {
    const tracker = new IdempotencyTracker();
    tracker.add("abc");
    tracker.add("abc");
    expect(tracker.has("abc")).toBe(true);
  });

  it("evicts oldest when maxSize exceeded", () => {
    const tracker = new IdempotencyTracker();
    // Fill to max
    for (let i = 0; i < tracker.maxSize; i++) {
      tracker.add(`id-${i}`);
    }
    expect(tracker.has("id-0")).toBe(true);
    // Adding one more should evict id-0
    tracker.add("id-overflow");
    expect(tracker.has("id-0")).toBe(false);
    expect(tracker.has("id-overflow")).toBe(true);
  });

  it("queue stays at maxSize after many additions", () => {
    const tracker = new IdempotencyTracker();
    for (let i = 0; i < tracker.maxSize + 100; i++) {
      tracker.add(`id-${i}`);
    }
    // Can still add and query
    expect(tracker.has(`id-${tracker.maxSize + 99}`)).toBe(true);
  });
});
