import { prisma } from "@/server/db";
import type { AISuggestion } from "@/lib/ai/types";
import { NEVER_AUTO_ACCEPT } from "@/lib/ai/types";
import crypto from "crypto";

// Invariant: AI suggestions NEVER auto-accept
if (!NEVER_AUTO_ACCEPT) {
  throw new Error("NEVER_AUTO_ACCEPT must be true — never remove this check");
}

function mapSuggestion(s: {
  id: string;
  runId: string;
  pageId: string;
  kind: string;
  symbolType: string | null;
  qty: unknown;
  unit: string | null;
  description: string;
  boundingBox: unknown;
  confidence: unknown;
  status: string;
  takeoffItemId: string | null;
  createdAt: Date;
}): AISuggestion {
  return {
    id: s.id,
    runId: s.runId,
    pageId: s.pageId,
    kind: s.kind as AISuggestion["kind"],
    symbolType: s.symbolType ?? undefined,
    qty: s.qty !== null ? Number(s.qty) : undefined,
    unit: s.unit ?? undefined,
    description: s.description,
    boundingBox: s.boundingBox as AISuggestion["boundingBox"],
    confidence: Number(s.confidence),
    status: s.status as AISuggestion["status"],
    takeoffItemId: s.takeoffItemId ?? undefined,
    createdAt: s.createdAt,
  };
}

export async function getSuggestionsForRun(runId: string): Promise<AISuggestion[]> {
  const suggestions = await prisma.aISuggestion.findMany({
    where: { runId },
    orderBy: { createdAt: "asc" },
  });
  return suggestions.map(mapSuggestion);
}

export async function getSuggestionsForSession(sessionId: string): Promise<AISuggestion[]> {
  const suggestions = await prisma.aISuggestion.findMany({
    where: { run: { sessionId } },
    orderBy: { createdAt: "asc" },
  });
  return suggestions.map(mapSuggestion);
}

export async function acceptSuggestion(
  suggestionId: string,
  userId: string,
  takeoffInput: { qty: number; unit: string; description: string }
): Promise<AISuggestion> {
  // NEVER auto-accept — this function requires explicit human input (takeoffInput)
  // Idempotent: if already accepted with a takeoffItemId, return existing record
  const existing = await prisma.aISuggestion.findUnique({ where: { id: suggestionId } });
  if (!existing) {
    throw Object.assign(new Error(`Suggestion not found: ${suggestionId}`), { code: "NOT_FOUND" });
  }

  if (existing.status === "accepted" && existing.takeoffItemId) {
    // Already accepted — idempotent, return existing record without creating again
    return mapSuggestion(existing);
  }

  // Integration point: in a full implementation, call takeoffService.createTakeoffItem
  // with planId, catalogItemId and the takeoffInput. For now, generate a stable ID
  // that would reference the created takeoff item.
  const takeoffItemId = crypto.randomUUID();

  const [updated] = await prisma.$transaction([
    prisma.aISuggestion.update({
      where: { id: suggestionId },
      data: { status: "accepted", takeoffItemId },
    }),
    prisma.aISuggestionDecision.create({
      data: {
        suggestionId,
        userId,
        action: "accept",
        takeoffInput,
      },
    }),
  ]);

  return mapSuggestion(updated);
}

export async function rejectSuggestion(
  suggestionId: string,
  userId: string
): Promise<AISuggestion> {
  const existing = await prisma.aISuggestion.findUnique({ where: { id: suggestionId } });
  if (!existing) {
    throw Object.assign(new Error(`Suggestion not found: ${suggestionId}`), { code: "NOT_FOUND" });
  }

  const [updated] = await prisma.$transaction([
    prisma.aISuggestion.update({
      where: { id: suggestionId },
      data: { status: "rejected" },
    }),
    prisma.aISuggestionDecision.create({
      data: {
        suggestionId,
        userId,
        action: "reject",
      },
    }),
  ]);

  return mapSuggestion(updated);
}

export async function bulkReviewSuggestions(
  items: Array<{
    suggestionId: string;
    action: "accept" | "reject";
    takeoffInput?: { qty: number; unit: string; description: string };
  }>,
  userId: string
): Promise<AISuggestion[]> {
  const results: AISuggestion[] = [];

  // Sequential — stop on first error
  for (const item of items) {
    if (item.action === "accept") {
      if (!item.takeoffInput) {
        throw new Error(`takeoffInput required for accept on suggestion ${item.suggestionId}`);
      }
      const result = await acceptSuggestion(item.suggestionId, userId, item.takeoffInput);
      results.push(result);
    } else {
      const result = await rejectSuggestion(item.suggestionId, userId);
      results.push(result);
    }
  }

  return results;
}
