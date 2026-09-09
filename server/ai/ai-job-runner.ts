import { prisma } from "@/server/db";
import type { AIProviders } from "./providers/ai-provider";
import { suppressDuplicates } from "@/lib/ai/duplicate-suppression";
import { recordUsage } from "./usage-budget-service";
import { NEVER_AUTO_ACCEPT } from "@/lib/ai/types";

// Ensure the invariant is checked at module load
if (!NEVER_AUTO_ACCEPT) {
  throw new Error("NEVER_AUTO_ACCEPT must be true");
}

const TOKENS_PER_PAGE = 1000;
const COST_PER_TOKEN = 0.00001;

export async function runAIAnalysis(runId: string, providers: AIProviders): Promise<void> {
  // Mark as running
  await prisma.aIAnalysisRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const run = await prisma.aIAnalysisRun.findUnique({ where: { id: runId } });
    if (!run) throw new Error(`Run not found: ${runId}`);

    let totalTokens = 0;
    let suggestionCount = 0;

    for (const pageId of run.pageIds) {
      // In a real implementation, we would fetch the page image from storage
      // For fake providers, we pass empty placeholders
      const fakeImageBase64 = "";
      const fakeMimeType = "image/png";

      // Run OCR
      const ocrBlocks = await providers.ocr.runOcr(fakeImageBase64, fakeMimeType);
      totalTokens += TOKENS_PER_PAGE;

      // Create OCR suggestions — NEVER auto-accept
      for (const block of ocrBlocks) {
        await prisma.aISuggestion.create({
          data: {
            runId,
            pageId,
            kind: "ocr_text",
            description: block.text,
            boundingBox: block.box,
            confidence: block.confidence,
            status: "pending",
          },
        });
        suggestionCount++;
      }

      // Run symbol detection
      const rawDetections = await providers.symbolDetection.detectSymbols(
        fakeImageBase64,
        fakeMimeType,
        ["diffuser", "grille", "vav", "ahu", "exhaust-fan"]
      );
      totalTokens += TOKENS_PER_PAGE;

      // Apply NMS to remove duplicates
      const detections = suppressDuplicates(rawDetections);

      for (const det of detections) {
        await prisma.aISuggestion.create({
          data: {
            runId,
            pageId,
            kind: "symbol_count",
            symbolType: det.symbolType,
            qty: det.count,
            unit: "ea",
            description: `${det.symbolType} (count: ${det.count})`,
            boundingBox: det.box,
            confidence: det.confidence,
            status: "pending",
          },
        });
        suggestionCount++;
      }

      // Run schedule extraction
      const scheduleRows = await providers.scheduleExtraction.extractSchedule(
        fakeImageBase64,
        fakeMimeType
      );
      totalTokens += TOKENS_PER_PAGE;

      for (const row of scheduleRows) {
        await prisma.aISuggestion.create({
          data: {
            runId,
            pageId,
            kind: "schedule_row",
            qty: row.qty,
            unit: row.unit,
            description: `${row.room}: ${row.qty} ${row.unit} — ${row.notes}`,
            confidence: 0.8,
            status: "pending",
          },
        });
        suggestionCount++;
      }
    }

    const totalCost = totalTokens * COST_PER_TOKEN;

    // Update run as completed
    await prisma.aIAnalysisRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        completedAt: new Date(),
        suggestionsCount: suggestionCount,
        tokensUsed: totalTokens,
        estimatedCostUsd: totalCost,
      },
    });

    // Record usage
    await recordUsage(runId, run.orgId, totalTokens, totalCost);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.aIAnalysisRun.update({
      where: { id: runId },
      data: { status: "failed", completedAt: new Date(), errorMessage: message },
    });
    throw err;
  }
}
