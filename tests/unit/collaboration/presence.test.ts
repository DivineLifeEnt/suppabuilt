import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { userColor, createPresenceThrottle } from "@/lib/collaboration/presence";

describe("userColor", () => {
  it("returns a string starting with #", () => {
    expect(userColor("user-123")).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("is consistent for the same userId", () => {
    const c1 = userColor("user-abc");
    const c2 = userColor("user-abc");
    expect(c1).toBe(c2);
  });

  it("returns distinct colors for different user ids (at least some)", () => {
    const colors = new Set(["alice", "bob", "carol", "dave", "eve", "frank"].map(userColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe("createPresenceThrottle", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("calls fn immediately on first invocation", () => {
    const fn = vi.fn();
    const throttled = createPresenceThrottle(fn, 50);
    const payload = { pageNumber: 1, cursor: null, activeTool: null, selectedIds: [], isTyping: false };
    throttled(payload);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not call fn again within the limit window", () => {
    const fn = vi.fn();
    const throttled = createPresenceThrottle(fn, 50);
    const payload = { pageNumber: 1, cursor: null, activeTool: null, selectedIds: [], isTyping: false };
    throttled(payload);
    throttled(payload);
    throttled(payload);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls fn again after limit window via timer", () => {
    const fn = vi.fn();
    const throttled = createPresenceThrottle(fn, 50);
    const payload = { pageNumber: 1, cursor: null, activeTool: null, selectedIds: [], isTyping: false };
    throttled(payload);
    throttled({ ...payload, pageNumber: 2 }); // queued
    vi.advanceTimersByTime(60);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[1][0].pageNumber).toBe(2);
  });

  it("limits to ~20Hz", () => {
    const fn = vi.fn();
    const throttled = createPresenceThrottle(fn, 50); // 50ms = 20Hz
    const payload = { pageNumber: 1, cursor: null, activeTool: null, selectedIds: [], isTyping: false };
    // Send 100 calls in rapid succession
    for (let i = 0; i < 100; i++) throttled(payload);
    vi.runAllTimers();
    // Should have fired far fewer than 100 times
    expect(fn.mock.calls.length).toBeLessThan(10);
  });
});
