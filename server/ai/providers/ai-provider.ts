import type { OcrBlock, SymbolDetection, ScheduleRow } from "@/lib/ai/types";

// Provider-neutral interfaces — never import real AI SDKs in lib/ or components/

export interface OcrProvider {
  name: string;
  runOcr(imageBase64: string, mimeType: string): Promise<OcrBlock[]>;
}

export interface SymbolDetectionProvider {
  name: string;
  detectSymbols(
    imageBase64: string,
    mimeType: string,
    symbolTypes: string[]
  ): Promise<SymbolDetection[]>;
}

export interface ScheduleExtractionProvider {
  name: string;
  extractSchedule(imageBase64: string, mimeType: string): Promise<ScheduleRow[]>;
}

export interface AIProviders {
  ocr: OcrProvider;
  symbolDetection: SymbolDetectionProvider;
  scheduleExtraction: ScheduleExtractionProvider;
}
