"use client";

import { create } from "zustand";
import { produce } from "immer";
import type {
  DrawingSet,
  DrawingSetVersion,
  PageMatch,
  PageAlignment,
  DrawingComparison,
  ChangeRegion,
  CarryForwardDecision,
  ProcessingJob,
  ComparisonMode,
  AffineMatrix,
} from "@/lib/revisions/types";
import type { NormalizedPoint } from "@/lib/markup/types";

// ─── State ────────────────────────────────────────────────────────────────────

export interface RevisionsState {
  drawingSets: DrawingSet[];
  versions: Map<string, DrawingSetVersion[]>;   // drawingSetId → versions
  pageMatches: PageMatch[];
  alignment: PageAlignment | null;
  alignmentDraft: { basePoints: NormalizedPoint[]; compPoints: NormalizedPoint[] };
  comparison: DrawingComparison | null;
  regions: ChangeRegion[];
  carryForwardDecisions: Map<string, CarryForwardDecision>;
  activeJob: ProcessingJob | null;
  comparisonMode: ComparisonMode;
  comparisonOpacity: number;          // 0..1
  blinkIntervalMs: number;            // 500
  navigationLinked: boolean;          // true
  zoom: number;
  panX: number;
  panY: number;

  // Actions
  setDrawingSets: (sets: DrawingSet[]) => void;
  addDrawingSet: (set: DrawingSet) => void;
  loadVersions: (drawingSetId: string, versions: DrawingSetVersion[]) => void;
  upsertVersion: (version: DrawingSetVersion) => void;
  setPageMatches: (matches: PageMatch[]) => void;
  updatePageMatch: (match: PageMatch) => void;
  setAlignment: (alignment: PageAlignment | null) => void;
  addAlignmentPoint: (side: "base" | "comp", point: NormalizedPoint) => void;
  removeAlignmentPoint: (side: "base" | "comp", index: number) => void;
  clearAlignmentDraft: () => void;
  setComparison: (comparison: DrawingComparison | null) => void;
  setRegions: (regions: ChangeRegion[]) => void;
  updateRegion: (region: ChangeRegion) => void;
  updateDecision: (decision: CarryForwardDecision) => void;
  setActiveJob: (job: ProcessingJob | null) => void;
  setComparisonMode: (mode: ComparisonMode) => void;
  setComparisonOpacity: (opacity: number) => void;
  setBlinkIntervalMs: (ms: number) => void;
  setNavigationLinked: (linked: boolean) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRevisionsStore = create<RevisionsState>((set) => ({
  drawingSets: [],
  versions: new Map(),
  pageMatches: [],
  alignment: null,
  alignmentDraft: { basePoints: [], compPoints: [] },
  comparison: null,
  regions: [],
  carryForwardDecisions: new Map(),
  activeJob: null,
  comparisonMode: "side-by-side",
  comparisonOpacity: 0.5,
  blinkIntervalMs: 500,
  navigationLinked: true,
  zoom: 1,
  panX: 0,
  panY: 0,

  setDrawingSets: (sets) => set({ drawingSets: sets }),

  addDrawingSet: (drawingSet) =>
    set((s) => ({ drawingSets: [...s.drawingSets, drawingSet] })),

  loadVersions: (drawingSetId, versions) =>
    set((s) =>
      produce(s, (draft) => {
        draft.versions.set(drawingSetId, versions);
      })
    ),

  upsertVersion: (version) =>
    set((s) =>
      produce(s, (draft) => {
        const list = draft.versions.get(version.drawingSetId) ?? [];
        const idx = list.findIndex((v) => v.id === version.id);
        if (idx >= 0) list[idx] = version;
        else list.unshift(version);
        draft.versions.set(version.drawingSetId, list);
      })
    ),

  setPageMatches: (pageMatches) => set({ pageMatches }),

  updatePageMatch: (match) =>
    set((s) => ({
      pageMatches: s.pageMatches.map((m) => (m.id === match.id ? match : m)),
    })),

  setAlignment: (alignment) => set({ alignment }),

  addAlignmentPoint: (side, point) =>
    set((s) =>
      produce(s, (draft) => {
        if (side === "base") {
          draft.alignmentDraft.basePoints.push(point);
        } else {
          draft.alignmentDraft.compPoints.push(point);
        }
      })
    ),

  removeAlignmentPoint: (side, index) =>
    set((s) =>
      produce(s, (draft) => {
        if (side === "base") {
          draft.alignmentDraft.basePoints.splice(index, 1);
        } else {
          draft.alignmentDraft.compPoints.splice(index, 1);
        }
      })
    ),

  clearAlignmentDraft: () =>
    set({ alignmentDraft: { basePoints: [], compPoints: [] } }),

  setComparison: (comparison) => set({ comparison }),

  setRegions: (regions) => set({ regions }),

  updateRegion: (region) =>
    set((s) => ({
      regions: s.regions.map((r) => (r.id === region.id ? region : r)),
    })),

  updateDecision: (decision) =>
    set((s) => {
      const next = new Map(s.carryForwardDecisions);
      next.set(decision.sourceAggregateId, decision);
      return { carryForwardDecisions: next };
    }),

  setActiveJob: (activeJob) => set({ activeJob }),

  setComparisonMode: (comparisonMode) => set({ comparisonMode }),

  setComparisonOpacity: (comparisonOpacity) =>
    set({ comparisonOpacity: Math.min(1, Math.max(0, comparisonOpacity)) }),

  setBlinkIntervalMs: (blinkIntervalMs) =>
    set({ blinkIntervalMs: Math.max(100, blinkIntervalMs) }),

  setNavigationLinked: (navigationLinked) => set({ navigationLinked }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(20, zoom)) }),

  setPan: (panX, panY) => set({ panX, panY }),

  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
}));
