export type BoundingBox = { x: number; y: number; w: number; h: number }; // normalized 0..1 page coords
export type OcrBlock = { text: string; box: BoundingBox; confidence: number };
export type SymbolDetection = { symbolType: string; box: BoundingBox; confidence: number; count: number };
export type ScheduleRow = { room: string; qty: number; unit: string; notes: string };

export type AISuggestionKind = "symbol_count" | "schedule_row" | "ocr_text";

export interface AISuggestion {
  id: string;
  runId: string;
  pageId: string; // DrawingPageVersion id
  kind: AISuggestionKind;
  symbolType?: string;
  qty?: number;
  unit?: string;
  description: string;
  boundingBox?: BoundingBox;
  confidence: number; // 0..1
  status: "pending" | "accepted" | "rejected" | "superseded";
  takeoffItemId?: string; // set after accept
  createdAt: Date;
}

export interface AIAnalysisRun {
  id: string;
  sessionId: string;
  orgId: string;
  pageIds: string[];
  providerName: string;
  modelVersion: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  suggestionsCount: number;
  tokensUsed: number;
  estimatedCostUsd: number; // BigInt-scaled in DB, number here
}

export interface AIUsageSummary {
  orgId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRuns: number;
  totalTokens: number;
  totalCostUsd: number;
  budgetLimitUsd: number;
  remainingUsd: number;
}

export const NEVER_AUTO_ACCEPT = true;
