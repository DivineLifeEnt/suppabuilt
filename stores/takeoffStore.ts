"use client";

import { create } from "zustand";
import { produce } from "immer";
import type {
  HvacCatalogItem,
  TakeoffItem,
  TakeoffAssembly,
  ProjectSystem,
  ProjectZone,
  ProjectLevel,
  ProjectPhase,
  TakeoffGroup,
  TakeoffFilter,
  TakeoffCommand,
} from "@/lib/takeoff/types";

// ─── Save state ───────────────────────────────────────────────────────────────
export type SaveState = "saved" | "saving" | "unsaved" | "failed" | "offline";

// ─── Active tool ──────────────────────────────────────────────────────────────
export type TakeoffTool = "select" | "place-symbol" | "count" | "none";

// ─── State ────────────────────────────────────────────────────────────────────
export interface TakeoffStoreState {
  // ── Data ──────────────────────────────────────────────────────────────────
  items: Record<string, TakeoffItem>;
  catalog: HvacCatalogItem[];
  assemblies: TakeoffAssembly[];
  systems: ProjectSystem[];
  zones: ProjectZone[];
  levels: ProjectLevel[];
  phases: ProjectPhase[];
  groups: TakeoffGroup[];

  // ── Selection / UI ────────────────────────────────────────────────────────
  selectedIds: string[];
  activeCatalogItemId: string | null;
  activeAssemblyId: string | null;
  tool: TakeoffTool;
  filter: TakeoffFilter;
  showListPanel: boolean;
  showSummaryPanel: boolean;
  showCatalogBrowser: boolean;
  showAssemblyBrowser: boolean;
  saveState: SaveState;

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  undoStack: TakeoffCommand[];
  redoStack: TakeoffCommand[];

  // ── Actions: data ─────────────────────────────────────────────────────────
  setItems: (items: TakeoffItem[]) => void;
  addItem: (item: TakeoffItem) => void;
  updateItem: (item: TakeoffItem) => void;
  removeItem: (id: string) => void;
  setCatalog: (catalog: HvacCatalogItem[]) => void;
  setAssemblies: (assemblies: TakeoffAssembly[]) => void;
  setSystems: (systems: ProjectSystem[]) => void;
  setZones: (zones: ProjectZone[]) => void;
  setLevels: (levels: ProjectLevel[]) => void;
  setPhases: (phases: ProjectPhase[]) => void;
  setGroups: (groups: TakeoffGroup[]) => void;

  // ── Actions: UI ───────────────────────────────────────────────────────────
  setTool: (tool: TakeoffTool) => void;
  setActiveCatalogItem: (id: string | null) => void;
  setActiveAssembly: (id: string | null) => void;
  setFilter: (filter: TakeoffFilter) => void;
  setSaveState: (state: SaveState) => void;
  setShowListPanel: (v: boolean) => void;
  setShowSummaryPanel: (v: boolean) => void;
  setShowCatalogBrowser: (v: boolean) => void;
  setShowAssemblyBrowser: (v: boolean) => void;

  // ── Actions: selection ────────────────────────────────────────────────────
  selectOne: (id: string) => void;
  selectMany: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // ── Actions: undo/redo ────────────────────────────────────────────────────
  pushUndo: (cmd: TakeoffCommand) => void;
  undo: () => void;
  redo: () => void;
}

// ─── Apply command (forward) ──────────────────────────────────────────────────
function applyForward(state: TakeoffStoreState, cmd: TakeoffCommand) {
  switch (cmd.type) {
    case "AddItem":
      state.items[cmd.item.id] = cmd.item;
      break;
    case "DeleteItem":
      delete state.items[cmd.item.id];
      break;
    case "UpdateItem":
      state.items[cmd.after.id] = cmd.after;
      break;
    case "BatchAdd":
      for (const item of cmd.items) state.items[item.id] = item;
      break;
  }
}

// ─── Apply command (reverse) ──────────────────────────────────────────────────
function applyReverse(state: TakeoffStoreState, cmd: TakeoffCommand) {
  switch (cmd.type) {
    case "AddItem":
      delete state.items[cmd.item.id];
      break;
    case "DeleteItem":
      state.items[cmd.item.id] = cmd.item;
      break;
    case "UpdateItem":
      state.items[cmd.before.id] = cmd.before;
      break;
    case "BatchAdd":
      for (const item of cmd.items) delete state.items[item.id];
      break;
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useTakeoffStore = create<TakeoffStoreState>((set) => ({
  items: {},
  catalog: [],
  assemblies: [],
  systems: [],
  zones: [],
  levels: [],
  phases: [],
  groups: [],

  selectedIds: [],
  activeCatalogItemId: null,
  activeAssemblyId: null,
  tool: "select",
  filter: {},
  showListPanel: true,
  showSummaryPanel: false,
  showCatalogBrowser: false,
  showAssemblyBrowser: false,
  saveState: "saved",

  undoStack: [],
  redoStack: [],

  // ── Data actions ──────────────────────────────────────────────────────────
  setItems: (items) =>
    set(
      produce((s: TakeoffStoreState) => {
        s.items = {};
        for (const item of items) s.items[item.id] = item;
      })
    ),
  addItem: (item) =>
    set(
      produce((s: TakeoffStoreState) => {
        s.items[item.id] = item;
      })
    ),
  updateItem: (item) =>
    set(
      produce((s: TakeoffStoreState) => {
        s.items[item.id] = item;
      })
    ),
  removeItem: (id) =>
    set(
      produce((s: TakeoffStoreState) => {
        delete s.items[id];
        s.selectedIds = s.selectedIds.filter((sid) => sid !== id);
      })
    ),
  setCatalog: (catalog) => set(produce((s: TakeoffStoreState) => { s.catalog = catalog; })),
  setAssemblies: (assemblies) => set(produce((s: TakeoffStoreState) => { s.assemblies = assemblies; })),
  setSystems: (systems) => set(produce((s: TakeoffStoreState) => { s.systems = systems; })),
  setZones: (zones) => set(produce((s: TakeoffStoreState) => { s.zones = zones; })),
  setLevels: (levels) => set(produce((s: TakeoffStoreState) => { s.levels = levels; })),
  setPhases: (phases) => set(produce((s: TakeoffStoreState) => { s.phases = phases; })),
  setGroups: (groups) => set(produce((s: TakeoffStoreState) => { s.groups = groups; })),

  // ── UI actions ────────────────────────────────────────────────────────────
  setTool: (tool) => set(produce((s: TakeoffStoreState) => { s.tool = tool; })),
  setActiveCatalogItem: (id) => set(produce((s: TakeoffStoreState) => { s.activeCatalogItemId = id; })),
  setActiveAssembly: (id) => set(produce((s: TakeoffStoreState) => { s.activeAssemblyId = id; })),
  setFilter: (filter) => set(produce((s: TakeoffStoreState) => { s.filter = filter; })),
  setSaveState: (state) => set(produce((s: TakeoffStoreState) => { s.saveState = state; })),
  setShowListPanel: (v) => set(produce((s: TakeoffStoreState) => { s.showListPanel = v; })),
  setShowSummaryPanel: (v) => set(produce((s: TakeoffStoreState) => { s.showSummaryPanel = v; })),
  setShowCatalogBrowser: (v) => set(produce((s: TakeoffStoreState) => { s.showCatalogBrowser = v; })),
  setShowAssemblyBrowser: (v) => set(produce((s: TakeoffStoreState) => { s.showAssemblyBrowser = v; })),

  // ── Selection ────────────────────────────────────────────────────────────
  selectOne: (id) => set(produce((s: TakeoffStoreState) => { s.selectedIds = [id]; })),
  selectMany: (ids) => set(produce((s: TakeoffStoreState) => { s.selectedIds = ids; })),
  toggleSelect: (id) =>
    set(
      produce((s: TakeoffStoreState) => {
        const i = s.selectedIds.indexOf(id);
        if (i >= 0) s.selectedIds.splice(i, 1);
        else s.selectedIds.push(id);
      })
    ),
  clearSelection: () => set(produce((s: TakeoffStoreState) => { s.selectedIds = []; })),
  selectAll: () =>
    set(
      produce((s: TakeoffStoreState) => {
        s.selectedIds = Object.keys(s.items);
      })
    ),

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  pushUndo: (cmd) =>
    set(
      produce((s: TakeoffStoreState) => {
        s.undoStack.push(cmd);
        if (s.undoStack.length > 100) s.undoStack.shift();
        s.redoStack = [];
        applyForward(s, cmd);
      })
    ),
  undo: () =>
    set(
      produce((s: TakeoffStoreState) => {
        const cmd = s.undoStack.pop();
        if (!cmd) return;
        s.redoStack.push(cmd);
        applyReverse(s, cmd);
      })
    ),
  redo: () =>
    set(
      produce((s: TakeoffStoreState) => {
        const cmd = s.redoStack.pop();
        if (!cmd) return;
        s.undoStack.push(cmd);
        applyForward(s, cmd);
      })
    ),
}));
