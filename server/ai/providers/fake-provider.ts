// Deterministic fake providers for CI/local. Never import real AI SDKs.
import type { OcrBlock, SymbolDetection, ScheduleRow } from "@/lib/ai/types";
import type {
  OcrProvider,
  SymbolDetectionProvider,
  ScheduleExtractionProvider,
  AIProviders,
} from "./ai-provider";

export class FakeOcrProvider implements OcrProvider {
  readonly name = "fake-ocr";

  async runOcr(_imageBase64: string, _mimeType: string): Promise<OcrBlock[]> {
    return [
      {
        text: "SUPPLY AIR",
        box: { x: 0.1, y: 0.05, w: 0.2, h: 0.03 },
        confidence: 0.92,
      },
      {
        text: "RETURN AIR",
        box: { x: 0.4, y: 0.05, w: 0.2, h: 0.03 },
        confidence: 0.92,
      },
      {
        text: "EXHAUST",
        box: { x: 0.7, y: 0.05, w: 0.15, h: 0.03 },
        confidence: 0.92,
      },
    ];
  }
}

export class FakeSymbolDetectionProvider implements SymbolDetectionProvider {
  readonly name = "fake-symbol-detection";

  async detectSymbols(
    _imageBase64: string,
    _mimeType: string,
    _symbolTypes: string[]
  ): Promise<SymbolDetection[]> {
    return [
      {
        symbolType: "diffuser",
        box: { x: 0.1, y: 0.1, w: 0.05, h: 0.05 },
        confidence: 0.91,
        count: 1,
      },
      {
        symbolType: "grille",
        box: { x: 0.5, y: 0.3, w: 0.04, h: 0.04 },
        confidence: 0.78,
        count: 1,
      },
    ];
  }
}

export class FakeScheduleExtractionProvider implements ScheduleExtractionProvider {
  readonly name = "fake-schedule-extraction";

  async extractSchedule(_imageBase64: string, _mimeType: string): Promise<ScheduleRow[]> {
    return [
      { room: "Office 101", qty: 2, unit: "ea", notes: "ceiling diffuser" },
      { room: "Corridor", qty: 1, unit: "ea", notes: "return grille" },
    ];
  }
}

export function buildFakeProviders(): AIProviders {
  return {
    ocr: new FakeOcrProvider(),
    symbolDetection: new FakeSymbolDetectionProvider(),
    scheduleExtraction: new FakeScheduleExtractionProvider(),
  };
}
