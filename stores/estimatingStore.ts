"use client";

import { create } from "zustand";
import { produce } from "immer";
import type {
  Estimate, EstimateVersion, EstimateSection, EstimateLine,
  EstimateAdjustment, ExportJob,
} from "@/lib/estimating/types";
import type { VersionTotals } from "@/server/estimating/calculation-service";
import type { SourceRefreshPreview } from "@/server/estimating/source-refresh-service";

// ─── State ────────────────────────────────────────────────────────────────────

export interface EstimatingState {
  estimates: Estimate[];
  activeVersion: EstimateVersion | null;
  sections: EstimateSection[];
  lines: EstimateLine[];
  totals: VersionTotals | null;
  adjustments: EstimateAdjustment[];
  refreshPreview: SourceRefreshPreview | null;
  exportJobs: ExportJob[];
  selectedLineIds: Set<string>;
  expandedSectionIds: Set<string>;
  showInternalCosts: boolean;
  isSaving: boolean;
  conflicts: Array<{ lineId: string; reason: string }>;

  // Actions
  setEstimates: (estimates: Estimate[]) => void;
  setActiveVersion: (version: EstimateVersion | null) => void;
  setSections: (sections: EstimateSection[]) => void;
  setLines: (lines: EstimateLine[]) => void;
  addLine: (line: EstimateLine) => void;
  updateLine: (line: EstimateLine) => void;
  removeLine: (lineId: string) => void;
  setTotals: (totals: VersionTotals | null) => void;
  setAdjustments: (adjustments: EstimateAdjustment[]) => void;
  setRefreshPreview: (preview: SourceRefreshPreview | null) => void;
  setExportJobs: (jobs: ExportJob[]) => void;
  addExportJob: (job: ExportJob) => void;
  updateExportJob: (job: ExportJob) => void;
  selectLine: (lineId: string) => void;
  deselectLine: (lineId: string) => void;
  toggleSelectLine: (lineId: string) => void;
  clearSelectedLines: () => void;
  selectAllLines: () => void;
  toggleSection: (sectionId: string) => void;
  expandAllSections: () => void;
  collapseAllSections: () => void;
  setShowInternalCosts: (show: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  addConflict: (lineId: string, reason: string) => void;
  clearConflicts: () => void;
  reset: () => void;
}

const initialState = {
  estimates: [],
  activeVersion: null,
  sections: [],
  lines: [],
  totals: null,
  adjustments: [],
  refreshPreview: null,
  exportJobs: [],
  selectedLineIds: new Set<string>(),
  expandedSectionIds: new Set<string>(),
  showInternalCosts: true,
  isSaving: false,
  conflicts: [],
};

export const useEstimatingStore = create<EstimatingState>((set) => ({
  ...initialState,

  setEstimates: (estimates) => set(produce((s: EstimatingState) => { s.estimates = estimates; })),
  setActiveVersion: (version) => set(produce((s: EstimatingState) => { s.activeVersion = version; })),
  setSections: (sections) => set(produce((s: EstimatingState) => { s.sections = sections; })),
  setLines: (lines) => set(produce((s: EstimatingState) => { s.lines = lines; })),

  addLine: (line) => set(produce((s: EstimatingState) => {
    s.lines.push(line);
  })),

  updateLine: (line) => set(produce((s: EstimatingState) => {
    const idx = s.lines.findIndex((l) => l.id === line.id);
    if (idx >= 0) s.lines[idx] = line;
  })),

  removeLine: (lineId) => set(produce((s: EstimatingState) => {
    s.lines = s.lines.filter((l) => l.id !== lineId);
    s.selectedLineIds.delete(lineId);
  })),

  setTotals: (totals) => set(produce((s: EstimatingState) => { s.totals = totals; })),
  setAdjustments: (adjustments) => set(produce((s: EstimatingState) => { s.adjustments = adjustments; })),
  setRefreshPreview: (preview) => set(produce((s: EstimatingState) => { s.refreshPreview = preview; })),
  setExportJobs: (jobs) => set(produce((s: EstimatingState) => { s.exportJobs = jobs; })),

  addExportJob: (job) => set(produce((s: EstimatingState) => {
    s.exportJobs.unshift(job);
  })),

  updateExportJob: (job) => set(produce((s: EstimatingState) => {
    const idx = s.exportJobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) s.exportJobs[idx] = job;
    else s.exportJobs.unshift(job);
  })),

  selectLine: (lineId) => set(produce((s: EstimatingState) => {
    s.selectedLineIds.add(lineId);
  })),

  deselectLine: (lineId) => set(produce((s: EstimatingState) => {
    s.selectedLineIds.delete(lineId);
  })),

  toggleSelectLine: (lineId) => set(produce((s: EstimatingState) => {
    if (s.selectedLineIds.has(lineId)) s.selectedLineIds.delete(lineId);
    else s.selectedLineIds.add(lineId);
  })),

  clearSelectedLines: () => set(produce((s: EstimatingState) => {
    s.selectedLineIds.clear();
  })),

  selectAllLines: () => set(produce((s: EstimatingState) => {
    for (const l of s.lines) s.selectedLineIds.add(l.id);
  })),

  toggleSection: (sectionId) => set(produce((s: EstimatingState) => {
    if (s.expandedSectionIds.has(sectionId)) s.expandedSectionIds.delete(sectionId);
    else s.expandedSectionIds.add(sectionId);
  })),

  expandAllSections: () => set(produce((s: EstimatingState) => {
    for (const sec of s.sections) s.expandedSectionIds.add(sec.id);
  })),

  collapseAllSections: () => set(produce((s: EstimatingState) => {
    s.expandedSectionIds.clear();
  })),

  setShowInternalCosts: (show) => set(produce((s: EstimatingState) => { s.showInternalCosts = show; })),
  setIsSaving: (saving) => set(produce((s: EstimatingState) => { s.isSaving = saving; })),

  addConflict: (lineId, reason) => set(produce((s: EstimatingState) => {
    if (!s.conflicts.some((c) => c.lineId === lineId)) {
      s.conflicts.push({ lineId, reason });
    }
  })),

  clearConflicts: () => set(produce((s: EstimatingState) => { s.conflicts = []; })),

  reset: () => set(produce((s: EstimatingState) => {
    Object.assign(s, {
      ...initialState,
      selectedLineIds: new Set<string>(),
      expandedSectionIds: new Set<string>(),
    });
  })),
}));
