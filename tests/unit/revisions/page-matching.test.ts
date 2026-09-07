import { describe, it, expect } from "vitest";
import { proposeMatches, normalizeSheetNumber } from "@/lib/revisions/page-matching";
import type { DrawingPageVersion } from "@/lib/revisions/types";

function makePage(overrides: Partial<DrawingPageVersion> & { id: string }): DrawingPageVersion {
  return {
    id: overrides.id,
    versionId: overrides.versionId ?? "v1",
    drawingSetId: overrides.drawingSetId ?? "set-1",
    pageIndex: overrides.pageIndex ?? 0,
    sheetNumber: overrides.sheetNumber ?? null,
    sheetTitle: overrides.sheetTitle ?? null,
    discipline: overrides.discipline ?? null,
    revisionLabel: overrides.revisionLabel ?? null,
    revisionDate: overrides.revisionDate ?? null,
    widthPt: overrides.widthPt ?? 1000,
    heightPt: overrides.heightPt ?? 800,
    nativeRotation: overrides.nativeRotation ?? 0,
    contentChecksum: overrides.contentChecksum ?? null,
    thumbnailKey: overrides.thumbnailKey ?? null,
    renderKey: overrides.renderKey ?? null,
    processingStatus: overrides.processingStatus ?? "ready",
    processingError: overrides.processingError ?? null,
    userConfirmedMetadata: overrides.userConfirmedMetadata ?? false,
    revision: overrides.revision ?? 1,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00Z",
  };
}

describe("normalizeSheetNumber", () => {
  it("lowercases", () => expect(normalizeSheetNumber("A-1")).toBe("a1"));
  it("removes dashes and spaces", () => expect(normalizeSheetNumber("A - 1")).toBe("a1"));
  it("strips leading zeros from start", () => expect(normalizeSheetNumber("01")).toBe("1"));
  it("returns empty string for null", () => expect(normalizeSheetNumber(null)).toBe(""));
  it("trims whitespace", () => expect(normalizeSheetNumber(" M-3 ")).toBe("m3"));
});

describe("proposeMatches — checksum", () => {
  it("matches pages with identical checksums at confidence 0.99", () => {
    const base = [makePage({ id: "b1", pageIndex: 0, contentChecksum: "abc123" })];
    const comp = [makePage({ id: "c1", pageIndex: 0, contentChecksum: "abc123" })];
    const result = proposeMatches(base, comp);
    const matched = result.filter((r) => r.status === "matched" || r.status === "manually-matched");
    expect(matched.length).toBeGreaterThanOrEqual(1);
    const match = matched.find((m) => m.basePageId === "b1" && m.comparisonPageId === "c1");
    expect(match).toBeDefined();
    expect(match!.confidence).toBeCloseTo(0.99);
  });
});

describe("proposeMatches — sheet number", () => {
  it("matches pages with same sheet number at confidence 0.95", () => {
    // Both normalize to "a1" — same lowercase, no dashes, no leading zeros
    const base = [makePage({ id: "b1", pageIndex: 0, sheetNumber: "A-1" })];
    const comp = [makePage({ id: "c1", pageIndex: 0, sheetNumber: "A-1" })];
    const result = proposeMatches(base, comp);
    const matched = result.filter((r) => r.basePageId === "b1" && r.comparisonPageId === "c1");
    expect(matched.length).toBe(1);
    expect(matched[0].confidence).toBeCloseTo(0.95);
  });
});

describe("proposeMatches — added / removed", () => {
  it("marks comp page as added if no base match found", () => {
    const base: DrawingPageVersion[] = [];
    const comp = [makePage({ id: "c1", pageIndex: 0, sheetNumber: "NEW-1" })];
    const result = proposeMatches(base, comp);
    const added = result.filter((r) => r.status === "added");
    expect(added.some((r) => r.comparisonPageId === "c1")).toBe(true);
  });

  it("marks base page as removed if no comp match at same index", () => {
    const base = [makePage({ id: "b1", pageIndex: 5, sheetNumber: "X-99" })];
    const comp: DrawingPageVersion[] = [];
    const result = proposeMatches(base, comp);
    const removed = result.filter((r) => r.status === "removed");
    expect(removed.some((r) => r.basePageId === "b1")).toBe(true);
  });
});

describe("proposeMatches — ambiguity", () => {
  it("flags ambiguous when two comp pages match the same base page at same score", () => {
    const base = [makePage({ id: "b1", pageIndex: 0, sheetNumber: "A-1" })];
    const comp = [
      makePage({ id: "c1", pageIndex: 0, sheetNumber: "A-1" }),
      makePage({ id: "c2", pageIndex: 1, sheetNumber: "A-1" }),
    ];
    const result = proposeMatches(base, comp);
    const hasAmbiguous = result.some((r) => r.status === "ambiguous");
    expect(hasAmbiguous).toBe(true);
  });
});
