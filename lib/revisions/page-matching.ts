import type { DrawingPageVersion, PageMatchStatus } from "./types";

export type MatchProposal = {
  basePageId: string | null;
  comparisonPageId: string | null;
  status: PageMatchStatus;
  confidence: number;
  matchReasons: string[];
};

// ─── Normalization helpers ─────────────────────────────────────────────────────

export function normalizeSheetNumber(raw: string | null): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[\s\-_]/g, "") // remove spaces, dashes, underscores
    .replace(/^0+/, "");     // remove leading zeros
}

export function normalizeTitleDiscipline(
  title: string | null,
  discipline: string | null
): string {
  const t = (title ?? "").toLowerCase().trim().replace(/\s+/g, " ");
  const d = (discipline ?? "").toLowerCase().trim();
  return `${d}::${t}`;
}

// ─── Main matching algorithm ───────────────────────────────────────────────────

/**
 * Propose matches between base and comparison pages.
 *
 * Rules in priority order:
 * 1. Content checksum match (confidence 0.99)
 * 2. Exact normalized sheet number match (confidence 0.95)
 * 3. Exact normalized title + discipline match (confidence 0.85)
 * 4. Page-position fallback (confidence 0.4)
 *
 * Pages that match multiple candidates get status "ambiguous".
 * Pages present on one side only get "added" or "removed".
 */
export function proposeMatches(
  basePages: DrawingPageVersion[],
  compPages: DrawingPageVersion[]
): MatchProposal[] {
  type Candidate = {
    basePageId: string;
    compPageId: string;
    confidence: number;
    reasons: string[];
  };

  const candidates: Candidate[] = [];

  // Rule 1: content checksum
  for (const bp of basePages) {
    if (!bp.contentChecksum) continue;
    for (const cp of compPages) {
      if (!cp.contentChecksum) continue;
      if (bp.contentChecksum === cp.contentChecksum) {
        candidates.push({
          basePageId: bp.id,
          compPageId: cp.id,
          confidence: 0.99,
          reasons: ["content-checksum"],
        });
      }
    }
  }

  // Rule 2: sheet number match (only for pairs not already matched by checksum)
  const checksumMatchedBase = new Set(candidates.map((c) => c.basePageId));
  const checksumMatchedComp = new Set(candidates.map((c) => c.compPageId));

  for (const bp of basePages) {
    if (checksumMatchedBase.has(bp.id)) continue;
    const normBase = normalizeSheetNumber(bp.sheetNumber);
    if (!normBase) continue;
    for (const cp of compPages) {
      if (checksumMatchedComp.has(cp.id)) continue;
      const normComp = normalizeSheetNumber(cp.sheetNumber);
      if (normBase === normComp && normBase !== "") {
        candidates.push({
          basePageId: bp.id,
          compPageId: cp.id,
          confidence: 0.95,
          reasons: ["sheet-number"],
        });
      }
    }
  }

  // Rule 3: title + discipline match
  const sheetMatchedBase = new Set(candidates.map((c) => c.basePageId));
  const sheetMatchedComp = new Set(candidates.map((c) => c.compPageId));

  for (const bp of basePages) {
    if (sheetMatchedBase.has(bp.id)) continue;
    const normBase = normalizeTitleDiscipline(bp.sheetTitle, bp.discipline);
    if (normBase === "::") continue;
    for (const cp of compPages) {
      if (sheetMatchedComp.has(cp.id)) continue;
      const normComp = normalizeTitleDiscipline(cp.sheetTitle, cp.discipline);
      if (normBase === normComp && normBase !== "::") {
        candidates.push({
          basePageId: bp.id,
          compPageId: cp.id,
          confidence: 0.85,
          reasons: ["title-discipline"],
        });
      }
    }
  }

  // Rule 4: page position fallback — match by index for remaining unmatched
  const matchedBase = new Set(candidates.map((c) => c.basePageId));
  const matchedComp = new Set(candidates.map((c) => c.compPageId));

  const unmatchedBase = basePages.filter((p) => !matchedBase.has(p.id));
  const unmatchedComp = compPages.filter((p) => !matchedComp.has(p.id));

  const fallbackCount = Math.min(unmatchedBase.length, unmatchedComp.length);
  for (let i = 0; i < fallbackCount; i++) {
    candidates.push({
      basePageId: unmatchedBase[i].id,
      compPageId: unmatchedComp[i].id,
      confidence: 0.4,
      reasons: ["page-position"],
    });
  }

  // ── Detect ambiguity: multiple candidates competing for the same page ─────────
  const baseUsageCount = new Map<string, number>();
  const compUsageCount = new Map<string, number>();

  for (const c of candidates) {
    baseUsageCount.set(c.basePageId, (baseUsageCount.get(c.basePageId) ?? 0) + 1);
    compUsageCount.set(c.compPageId, (compUsageCount.get(c.compPageId) ?? 0) + 1);
  }

  const results: MatchProposal[] = [];

  for (const c of candidates) {
    const baseConflict = (baseUsageCount.get(c.basePageId) ?? 0) > 1;
    const compConflict = (compUsageCount.get(c.compPageId) ?? 0) > 1;
    const isAmbiguous = baseConflict || compConflict;

    results.push({
      basePageId: c.basePageId,
      comparisonPageId: c.compPageId,
      status: isAmbiguous ? "ambiguous" : "matched",
      confidence: c.confidence,
      matchReasons: c.reasons,
    });
  }

  // ── Unmatched base pages → "removed" ─────────────────────────────────────────
  const resultBaseIds = new Set(results.map((r) => r.basePageId));
  for (const bp of basePages) {
    if (!resultBaseIds.has(bp.id)) {
      results.push({
        basePageId: bp.id,
        comparisonPageId: null,
        status: "removed",
        confidence: 1,
        matchReasons: ["no-comparison-counterpart"],
      });
    }
  }

  // ── Unmatched comparison pages → "added" ─────────────────────────────────────
  const resultCompIds = new Set(
    results.map((r) => r.comparisonPageId).filter((id): id is string => id !== null)
  );
  for (const cp of compPages) {
    if (!resultCompIds.has(cp.id)) {
      results.push({
        basePageId: null,
        comparisonPageId: cp.id,
        status: "added",
        confidence: 1,
        matchReasons: ["no-base-counterpart"],
      });
    }
  }

  return results;
}
