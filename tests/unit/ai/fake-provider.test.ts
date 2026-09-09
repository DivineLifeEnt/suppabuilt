import { describe, it, expect } from "vitest";
import {
  FakeOcrProvider,
  FakeSymbolDetectionProvider,
  FakeScheduleExtractionProvider,
  buildFakeProviders,
} from "@/server/ai/providers/fake-provider";

describe("FakeOcrProvider", () => {
  it("returns exactly 3 OCR blocks", async () => {
    const provider = new FakeOcrProvider();
    const blocks = await provider.runOcr("fake-base64", "image/png");
    expect(blocks).toHaveLength(3);
  });

  it("returns expected text values", async () => {
    const provider = new FakeOcrProvider();
    const blocks = await provider.runOcr("fake-base64", "image/png");
    const texts = blocks.map((b) => b.text);
    expect(texts).toContain("SUPPLY AIR");
    expect(texts).toContain("RETURN AIR");
    expect(texts).toContain("EXHAUST");
  });

  it("all blocks have confidence 0.92", async () => {
    const provider = new FakeOcrProvider();
    const blocks = await provider.runOcr("fake-base64", "image/png");
    for (const block of blocks) {
      expect(block.confidence).toBe(0.92);
    }
  });

  it("all blocks have valid bounding boxes in 0..1 range", async () => {
    const provider = new FakeOcrProvider();
    const blocks = await provider.runOcr("fake-base64", "image/png");
    for (const block of blocks) {
      expect(block.box.x).toBeGreaterThanOrEqual(0);
      expect(block.box.y).toBeGreaterThanOrEqual(0);
      expect(block.box.w).toBeGreaterThan(0);
      expect(block.box.h).toBeGreaterThan(0);
      expect(block.box.x + block.box.w).toBeLessThanOrEqual(1.0);
      expect(block.box.y + block.box.h).toBeLessThanOrEqual(1.0);
    }
  });

  it("is deterministic (same result on multiple calls)", async () => {
    const provider = new FakeOcrProvider();
    const first = await provider.runOcr("a", "image/png");
    const second = await provider.runOcr("b", "image/png");
    expect(first).toEqual(second);
  });
});

describe("FakeSymbolDetectionProvider", () => {
  it("returns exactly 2 detections", async () => {
    const provider = new FakeSymbolDetectionProvider();
    const detections = await provider.detectSymbols("fake-base64", "image/png", ["diffuser", "grille"]);
    expect(detections).toHaveLength(2);
  });

  it("returns a diffuser detection", async () => {
    const provider = new FakeSymbolDetectionProvider();
    const detections = await provider.detectSymbols("fake-base64", "image/png", []);
    const diffuser = detections.find((d) => d.symbolType === "diffuser");
    expect(diffuser).toBeDefined();
    expect(diffuser!.confidence).toBe(0.91);
  });

  it("returns a grille detection", async () => {
    const provider = new FakeSymbolDetectionProvider();
    const detections = await provider.detectSymbols("fake-base64", "image/png", []);
    const grille = detections.find((d) => d.symbolType === "grille");
    expect(grille).toBeDefined();
    expect(grille!.confidence).toBe(0.78);
  });
});

describe("FakeScheduleExtractionProvider", () => {
  it("returns exactly 2 schedule rows", async () => {
    const provider = new FakeScheduleExtractionProvider();
    const rows = await provider.extractSchedule("fake-base64", "image/png");
    expect(rows).toHaveLength(2);
  });

  it("returns expected room names", async () => {
    const provider = new FakeScheduleExtractionProvider();
    const rows = await provider.extractSchedule("fake-base64", "image/png");
    const rooms = rows.map((r) => r.room);
    expect(rooms).toContain("Office 101");
    expect(rooms).toContain("Corridor");
  });
});

describe("buildFakeProviders", () => {
  it("returns an object with ocr, symbolDetection, scheduleExtraction", () => {
    const providers = buildFakeProviders();
    expect(providers.ocr).toBeDefined();
    expect(providers.symbolDetection).toBeDefined();
    expect(providers.scheduleExtraction).toBeDefined();
  });

  it("providers have correct names", () => {
    const providers = buildFakeProviders();
    expect(providers.ocr.name).toBe("fake-ocr");
    expect(providers.symbolDetection.name).toBe("fake-symbol-detection");
    expect(providers.scheduleExtraction.name).toBe("fake-schedule-extraction");
  });
});
