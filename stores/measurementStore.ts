"use client";

import { create } from "zustand";
import { produce } from "immer";
import type {
  Measurement,
  Calibration,
  MeasurementGroup,
  MeasurementTool,
  MeasurementStatus,
  MeasurementStyle,
  UnitSystem,
  LinearUnit,
  AreaUnit,
  VolumeUnit,
  ArchitecturalDenominator,
} from "@/lib/measurement/types";
import { DEFAULT_MEASUREMENT_STYLE } from "@/lib/measurement/types";
import type { NormalizedPoint } from "@/lib/markup/types";
import type { SnapSettings, SnapCandidate } from "@/lib/measurement/snapping";
import { DEFAULT_SNAP_SETTINGS } from "@/lib/measurement/snapping";

// ─── Command types (for undo/redo) ────────────────────────────────────────────
export type AddMeasurementCommand = { type: "AddMeasurement"; measurement: Measurement };
export type DeleteMeasurementCommand = { type: "DeleteMeasurement"; measurement: Measurement };
export type MoveMeasurementCommand = {
  type: "MoveMeasurement";
  id: string;
  before: Partial<Measurement>;
  after: Partial<Measurement>;
};
export type UpdateMeasurementStyleCommand = {
  type: "UpdateMeasurementStyle";
  id: string;
  before: MeasurementStyle;
  after: MeasurementStyle;
};
export type AddCalibrationCommand = { type: "AddCalibration"; calibration: Calibration };
export type UpdateCalibrationCommand = {
  type: "UpdateCalibration";
  before: Calibration;
  after: Calibration;
};
export type DeleteCalibrationCommand = { type: "DeleteCalibration"; calibration: Calibration };
export type BatchMeasurementCommand = {
  type: "BatchMeasurement";
  forward: Array<{ op: "create" | "delete"; measurement: Measurement }>;
  backward: Array<{ op: "create" | "delete"; measurement: Measurement }>;
};

export type MeasurementCommand =
  | AddMeasurementCommand
  | DeleteMeasurementCommand
  | MoveMeasurementCommand
  | UpdateMeasurementStyleCommand
  | AddCalibrationCommand
  | UpdateCalibrationCommand
  | DeleteCalibrationCommand
  | BatchMeasurementCommand;

// ─── Save state ───────────────────────────────────────────────────────────────
export type MeasurementSaveState = "saved" | "saving" | "unsaved" | "failed" | "offline";

// ─── Filter / sort ────────────────────────────────────────────────────────────
export type MeasurementFilter = {
  status?: MeasurementStatus;
  type?: Measurement["type"];
  groupId?: string;
};

export type MeasurementSortBy = "zIndex" | "createdAt" | "type";

// ─── Display defaults ─────────────────────────────────────────────────────────
export type DisplayDefaults = {
  unitSystem: UnitSystem;
  linearUnit: LinearUnit;
  areaUnit: AreaUnit;
  volumeUnit: VolumeUnit;
  precision: number;
  archDenom: ArchitecturalDenominator;
};

const DEFAULT_DISPLAY_DEFAULTS: DisplayDefaults = {
  unitSystem: "imperial-architectural",
  linearUnit: "foot",
  areaUnit: "square-foot",
  volumeUnit: "cubic-foot",
  precision: 2,
  archDenom: 8,
};

// ─── State ────────────────────────────────────────────────────────────────────
export interface MeasurementStoreState {
  calibrations: Record<string, Calibration>;
  pageCalibration: Record<number, string | null>; // pageNumber → calibrationId
  measurements: Record<string, Measurement>;
  groups: Record<string, MeasurementGroup>;
  activeTool: MeasurementTool | null;
  draftPoints: NormalizedPoint[];
  draftDepthMm: number;
  selectedIds: string[];
  snapSettings: SnapSettings;
  snapCandidate: SnapCandidate | null;
  displayDefaults: DisplayDefaults;
  history: { past: MeasurementCommand[]; future: MeasurementCommand[] };
  saveState: MeasurementSaveState;
  filter: MeasurementFilter;
  sortBy: MeasurementSortBy;
  clipboard: Measurement[];

  // ── Tool / draft ─────────────────────────────────────────────────────────
  setTool: (tool: MeasurementTool | null) => void;
  setDraftPoints: (pts: NormalizedPoint[]) => void;
  addDraftPoint: (pt: NormalizedPoint) => void;
  removeLastDraftPoint: () => void;
  clearDraft: () => void;
  setDraftDepthMm: (d: number) => void;

  // ── Selection ─────────────────────────────────────────────────────────────
  setSelectedIds: (ids: string[]) => void;
  selectOne: (id: string) => void;
  selectAdd: (id: string) => void;
  deselectAll: () => void;

  // ── Snap ──────────────────────────────────────────────────────────────────
  setSnapCandidate: (c: SnapCandidate | null) => void;
  setSnapSettings: (s: Partial<SnapSettings>) => void;

  // ── Measurements ──────────────────────────────────────────────────────────
  addMeasurement: (m: Measurement) => void;
  updateMeasurement: (id: string, patch: Partial<Measurement>) => void;
  deleteMeasurement: (id: string) => void;
  loadMeasurements: (ms: Measurement[]) => void;
  upsertMeasurement: (m: Measurement) => void;

  // ── Calibrations ──────────────────────────────────────────────────────────
  addCalibration: (c: Calibration) => void;
  updateCalibration: (c: Calibration) => void;
  deleteCalibration: (id: string) => void;
  loadCalibrations: (cs: Calibration[]) => void;
  setPageCalibration: (pageNumber: number, calibrationId: string | null) => void;

  // ── Groups ────────────────────────────────────────────────────────────────
  addGroup: (g: MeasurementGroup) => void;
  updateGroup: (g: MeasurementGroup) => void;
  deleteGroup: (id: string) => void;
  loadGroups: (gs: MeasurementGroup[]) => void;

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  undo: () => void;
  redo: () => void;

  // ── Clipboard ─────────────────────────────────────────────────────────────
  copySelected: () => void;
  paste: (planId: string, pageNumber: number) => void;
  duplicateSelected: (planId: string, pageNumber: number) => void;

  // ── Display ───────────────────────────────────────────────────────────────
  setDisplayDefaults: (d: Partial<DisplayDefaults>) => void;

  // ── Filter / sort ─────────────────────────────────────────────────────────
  setFilter: (f: MeasurementFilter) => void;
  setSortBy: (s: MeasurementSortBy) => void;

  // ── Save state ────────────────────────────────────────────────────────────
  setSaveState: (s: MeasurementSaveState) => void;
}

const MAX_HISTORY = 100;

// ─── Store ────────────────────────────────────────────────────────────────────
export const useMeasurementStore = create<MeasurementStoreState>((set, get) => ({
  calibrations: {},
  pageCalibration: {},
  measurements: {},
  groups: {},
  activeTool: null,
  draftPoints: [],
  draftDepthMm: 100,
  selectedIds: [],
  snapSettings: DEFAULT_SNAP_SETTINGS,
  snapCandidate: null,
  displayDefaults: DEFAULT_DISPLAY_DEFAULTS,
  history: { past: [], future: [] },
  saveState: "saved",
  filter: {},
  sortBy: "zIndex",
  clipboard: [],

  // ── Tool / draft ──────────────────────────────────────────────────────────
  setTool: (tool) =>
    set({ activeTool: tool, draftPoints: [], snapCandidate: null }),

  setDraftPoints: (pts) => set({ draftPoints: pts }),

  addDraftPoint: (pt) =>
    set((s) => ({ draftPoints: [...s.draftPoints, pt] })),

  removeLastDraftPoint: () =>
    set((s) => ({ draftPoints: s.draftPoints.slice(0, -1) })),

  clearDraft: () => set({ draftPoints: [], snapCandidate: null }),

  setDraftDepthMm: (d) => set({ draftDepthMm: d }),

  // ── Selection ─────────────────────────────────────────────────────────────
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  selectOne: (id) => set({ selectedIds: [id] }),
  selectAdd: (id) =>
    set((s) =>
      s.selectedIds.includes(id) ? s : { selectedIds: [...s.selectedIds, id] }
    ),
  deselectAll: () => set({ selectedIds: [] }),

  // ── Snap ──────────────────────────────────────────────────────────────────
  setSnapCandidate: (c) => set({ snapCandidate: c }),
  setSnapSettings: (s) =>
    set((prev) => ({ snapSettings: { ...prev.snapSettings, ...s } })),

  // ── Measurements ──────────────────────────────────────────────────────────
  addMeasurement: (m) =>
    set((s) => {
      const cmd: MeasurementCommand = { type: "AddMeasurement", measurement: m };
      const past = [...s.history.past, cmd].slice(-MAX_HISTORY);
      return {
        measurements: { ...s.measurements, [m.id]: m },
        history: { past, future: [] },
        saveState: "unsaved",
      };
    }),

  updateMeasurement: (id, patch) =>
    set((s) => {
      const m = s.measurements[id];
      if (!m) return s;
      const updated = { ...m, ...patch } as Measurement;
      return {
        measurements: { ...s.measurements, [id]: updated },
        saveState: "unsaved",
      };
    }),

  deleteMeasurement: (id) =>
    set((s) => {
      const m = s.measurements[id];
      if (!m) return s;
      const cmd: MeasurementCommand = { type: "DeleteMeasurement", measurement: m };
      const past = [...s.history.past, cmd].slice(-MAX_HISTORY);
      const next = { ...s.measurements };
      delete next[id];
      return {
        measurements: next,
        selectedIds: s.selectedIds.filter((i) => i !== id),
        history: { past, future: [] },
        saveState: "unsaved",
      };
    }),

  loadMeasurements: (ms) =>
    set({
      measurements: Object.fromEntries(ms.map((m) => [m.id, m])),
      history: { past: [], future: [] },
      saveState: "saved",
    }),

  upsertMeasurement: (m) =>
    set((s) => ({ measurements: { ...s.measurements, [m.id]: m } })),

  // ── Calibrations ──────────────────────────────────────────────────────────
  addCalibration: (c) =>
    set((s) => {
      const cmd: MeasurementCommand = { type: "AddCalibration", calibration: c };
      const past = [...s.history.past, cmd].slice(-MAX_HISTORY);
      return {
        calibrations: { ...s.calibrations, [c.id]: c },
        history: { past, future: [] },
      };
    }),

  updateCalibration: (c) =>
    set((s) => {
      const before = s.calibrations[c.id];
      if (!before) return s;
      const cmd: MeasurementCommand = { type: "UpdateCalibration", before, after: c };
      const past = [...s.history.past, cmd].slice(-MAX_HISTORY);
      return {
        calibrations: { ...s.calibrations, [c.id]: c },
        history: { past, future: [] },
      };
    }),

  deleteCalibration: (id) =>
    set((s) => {
      const c = s.calibrations[id];
      if (!c) return s;
      const cmd: MeasurementCommand = { type: "DeleteCalibration", calibration: c };
      const past = [...s.history.past, cmd].slice(-MAX_HISTORY);
      const next = { ...s.calibrations };
      delete next[id];
      return {
        calibrations: next,
        history: { past, future: [] },
      };
    }),

  loadCalibrations: (cs) =>
    set({ calibrations: Object.fromEntries(cs.map((c) => [c.id, c])) }),

  setPageCalibration: (pageNumber, calibrationId) =>
    set((s) => ({
      pageCalibration: { ...s.pageCalibration, [pageNumber]: calibrationId },
    })),

  // ── Groups ────────────────────────────────────────────────────────────────
  addGroup: (g) =>
    set((s) => ({ groups: { ...s.groups, [g.id]: g } })),

  updateGroup: (g) =>
    set((s) => ({ groups: { ...s.groups, [g.id]: g } })),

  deleteGroup: (id) =>
    set((s) => {
      const next = { ...s.groups };
      delete next[id];
      return { groups: next };
    }),

  loadGroups: (gs) =>
    set({ groups: Object.fromEntries(gs.map((g) => [g.id, g])) }),

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  undo: () =>
    set((s) => {
      const cmd = s.history.past[s.history.past.length - 1];
      if (!cmd) return s;

      const past = s.history.past.slice(0, -1);
      const future = [cmd, ...s.history.future];

      switch (cmd.type) {
        case "AddMeasurement": {
          const next = { ...s.measurements };
          delete next[cmd.measurement.id];
          return { measurements: next, history: { past, future } };
        }
        case "DeleteMeasurement":
          return {
            measurements: { ...s.measurements, [cmd.measurement.id]: cmd.measurement },
            history: { past, future },
          };
        case "AddCalibration": {
          const next = { ...s.calibrations };
          delete next[cmd.calibration.id];
          return { calibrations: next, history: { past, future } };
        }
        case "UpdateCalibration":
          return {
            calibrations: { ...s.calibrations, [cmd.before.id]: cmd.before },
            history: { past, future },
          };
        case "DeleteCalibration":
          return {
            calibrations: { ...s.calibrations, [cmd.calibration.id]: cmd.calibration },
            history: { past, future },
          };
        default:
          return { history: { past, future } };
      }
    }),

  redo: () =>
    set((s) => {
      const cmd = s.history.future[0];
      if (!cmd) return s;

      const future = s.history.future.slice(1);
      const past = [...s.history.past, cmd].slice(-MAX_HISTORY);

      switch (cmd.type) {
        case "AddMeasurement":
          return {
            measurements: { ...s.measurements, [cmd.measurement.id]: cmd.measurement },
            history: { past, future },
          };
        case "DeleteMeasurement": {
          const next = { ...s.measurements };
          delete next[cmd.measurement.id];
          return { measurements: next, history: { past, future } };
        }
        case "AddCalibration":
          return {
            calibrations: { ...s.calibrations, [cmd.calibration.id]: cmd.calibration },
            history: { past, future },
          };
        case "UpdateCalibration":
          return {
            calibrations: { ...s.calibrations, [cmd.after.id]: cmd.after },
            history: { past, future },
          };
        case "DeleteCalibration": {
          const next = { ...s.calibrations };
          delete next[cmd.calibration.id];
          return { calibrations: next, history: { past, future } };
        }
        default:
          return { history: { past, future } };
      }
    }),

  // ── Clipboard ─────────────────────────────────────────────────────────────
  copySelected: () =>
    set((s) => ({
      clipboard: s.selectedIds
        .map((id) => s.measurements[id])
        .filter((m): m is Measurement => m != null),
    })),

  paste: (planId, pageNumber) =>
    set((s) => {
      const OFFSET = 0.02;
      const newMs = s.clipboard.map((m) => ({
        ...m,
        id: crypto.randomUUID(),
        planId,
        pageNumber,
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const measurements = { ...s.measurements };
      for (const m of newMs) measurements[m.id] = m as Measurement;
      void OFFSET; // offset not applied here for simplicity — positions stay same
      return {
        measurements,
        selectedIds: newMs.map((m) => m.id),
        saveState: "unsaved",
      };
    }),

  duplicateSelected: (planId, pageNumber) => {
    get().copySelected();
    get().paste(planId, pageNumber);
  },

  // ── Display ───────────────────────────────────────────────────────────────
  setDisplayDefaults: (d) =>
    set((s) => ({ displayDefaults: { ...s.displayDefaults, ...d } })),

  // ── Filter / sort ─────────────────────────────────────────────────────────
  setFilter: (f) => set({ filter: f }),
  setSortBy: (sortBy) => set({ sortBy }),

  // ── Save state ────────────────────────────────────────────────────────────
  setSaveState: (saveState) => set({ saveState }),
}));

// Suppress unused import warning for produce
void produce;
