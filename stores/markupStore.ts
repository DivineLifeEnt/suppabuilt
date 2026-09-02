"use client";

import { create } from "zustand";
import { produce } from "immer";
import type {
  Markup,
  MarkupTool,
  MarkupStatus,
  MarkupStyle,
  NormalizedPoint,
  NormalizedBounds,
} from "@/lib/markup/types";
import {
  type HistoryStack,
  type HistoryCommand,
  createHistoryStack,
  pushCommand,
  pushOrCoalesceMove,
  undo,
  redo,
  applyCommand,
} from "@/lib/markup/history";
import type { UpdateMarkupInput } from "@/lib/markup/types";

// ─── Save state ───────────────────────────────────────────────────────────────
export type SaveState = "saved" | "saving" | "unsaved" | "failed" | "offline";

// ─── Filter ───────────────────────────────────────────────────────────────────
export type MarkupFilter = {
  status?: MarkupStatus;
  tool?: MarkupTool;
};

// ─── State ────────────────────────────────────────────────────────────────────
export interface MarkupStoreState {
  markups: Record<string, Markup>;
  selectedIds: string[];
  tool: MarkupTool;
  activeColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  history: HistoryStack;
  saveState: SaveState;
  clipboard: Markup[];
  showPanel: boolean;
  filter: MarkupFilter;

  // ── Actions ──────────────────────────────────────────────────────────────
  setTool: (tool: MarkupTool) => void;
  setActiveColor: (color: string) => void;
  setStrokeWidth: (w: number) => void;
  setOpacity: (o: number) => void;
  setFontSize: (s: number) => void;
  setSaveState: (state: SaveState) => void;
  setShowPanel: (v: boolean) => void;
  setFilter: (filter: MarkupFilter) => void;

  // ── Selection ─────────────────────────────────────────────────────────────
  selectOne: (id: string) => void;
  selectAdd: (id: string) => void;
  selectMany: (ids: string[]) => void;
  deselect: (id?: string) => void;
  deselectAll: () => void;

  // ── CRUD (via history) ────────────────────────────────────────────────────
  addMarkup: (markup: Markup) => void;
  deleteMarkup: (id: string) => void;
  deleteSelected: () => void;
  updateMarkupGeometry: (
    id: string,
    patch: { bounds?: NormalizedBounds; points?: NormalizedPoint[]; start?: NormalizedPoint; end?: NormalizedPoint; point?: NormalizedPoint },
    coalesce?: boolean
  ) => void;
  updateMarkupStyle: (id: string, style: MarkupStyle) => void;
  updateMarkupStatus: (id: string, status: MarkupStatus) => void;
  setLocked: (id: string, locked: boolean) => void;
  setVisible: (id: string, visible: boolean) => void;
  updateMarkupField: (id: string, updates: UpdateMarkupInput) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  undo: () => void;
  redo: () => void;

  // ── Clipboard ─────────────────────────────────────────────────────────────
  copy: () => void;
  paste: (planId: string, pageNumber: number) => void;
  duplicate: (planId: string, pageNumber: number) => void;

  // ── Bulk load (from API) ──────────────────────────────────────────────────
  loadMarkups: (markups: Markup[]) => void;
  upsertMarkup: (markup: Markup) => void;
  removeMarkup: (id: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useMarkupStore = create<MarkupStoreState>((set, get) => ({
  markups: {},
  selectedIds: [],
  tool: "select",
  activeColor: "#EF4444",
  strokeWidth: 2,
  opacity: 1,
  fontSize: 16,
  history: createHistoryStack(),
  saveState: "saved",
  clipboard: [],
  showPanel: true,
  filter: {},

  // ── Property setters ──────────────────────────────────────────────────────
  setTool: (tool) => set({ tool, selectedIds: [] }),
  setActiveColor: (activeColor) => set({ activeColor }),
  setStrokeWidth: (strokeWidth) =>
    set({ strokeWidth: Math.min(24, Math.max(0.5, strokeWidth)) }),
  setOpacity: (opacity) =>
    set({ opacity: Math.min(1, Math.max(0.05, opacity)) }),
  setFontSize: (fontSize) =>
    set({ fontSize: Math.min(144, Math.max(8, fontSize)) }),
  setSaveState: (saveState) => set({ saveState }),
  setShowPanel: (showPanel) => set({ showPanel }),
  setFilter: (filter) => set({ filter }),

  // ── Selection ─────────────────────────────────────────────────────────────
  selectOne: (id) => set({ selectedIds: [id] }),
  selectAdd: (id) =>
    set((s) =>
      s.selectedIds.includes(id)
        ? s
        : { selectedIds: [...s.selectedIds, id] }
    ),
  selectMany: (ids) => set({ selectedIds: ids }),
  deselect: (id) =>
    set((s) => ({
      selectedIds: id
        ? s.selectedIds.filter((i) => i !== id)
        : [],
    })),
  deselectAll: () => set({ selectedIds: [] }),

  // ── Add ───────────────────────────────────────────────────────────────────
  addMarkup: (markup) =>
    set((s) => {
      const cmd: HistoryCommand = { type: "AddMarkup", markup };
      return {
        markups: { ...s.markups, [markup.id]: markup },
        history: pushCommand(s.history, cmd),
        saveState: "unsaved",
      };
    }),

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteMarkup: (id) =>
    set((s) => {
      const m = s.markups[id];
      if (!m) return s;
      const cmd: HistoryCommand = { type: "DeleteMarkup", markup: m };
      const next = { ...s.markups };
      delete next[id];
      return {
        markups: next,
        selectedIds: s.selectedIds.filter((i) => i !== id),
        history: pushCommand(s.history, cmd),
        saveState: "unsaved",
      };
    }),

  deleteSelected: () =>
    set((s) => {
      let markups = { ...s.markups };
      let history = s.history;
      for (const id of s.selectedIds) {
        const m = markups[id];
        if (!m || m.locked) continue;
        const cmd: HistoryCommand = { type: "DeleteMarkup", markup: m };
        history = pushCommand(history, cmd);
        delete markups[id];
      }
      return { markups, selectedIds: [], history, saveState: "unsaved" };
    }),

  // ── Geometry update ───────────────────────────────────────────────────────
  updateMarkupGeometry: (id, patch, coalesce = false) =>
    set((s) => {
      const m = s.markups[id];
      if (!m || m.locked) return s;

      const before = extractGeometryPatch(m);
      const cmd: HistoryCommand = {
        type: "MoveMarkup",
        id,
        before,
        after: patch,
      };
      const history = coalesce
        ? pushOrCoalesceMove(s.history, cmd as Parameters<typeof pushOrCoalesceMove>[1])
        : pushCommand(s.history, cmd);

      const updated = applyPatch(m, patch);
      return {
        markups: { ...s.markups, [id]: updated },
        history,
        saveState: "unsaved",
      };
    }),

  // ── Style update ──────────────────────────────────────────────────────────
  updateMarkupStyle: (id, style) =>
    set((s) => {
      const m = s.markups[id];
      if (!m) return s;
      const cmd: HistoryCommand = {
        type: "UpdateStyle",
        id,
        before: m.style,
        after: style,
      };
      return {
        markups: { ...s.markups, [id]: { ...m, style } },
        history: pushCommand(s.history, cmd),
        saveState: "unsaved",
      };
    }),

  // ── Status update ─────────────────────────────────────────────────────────
  updateMarkupStatus: (id, status) =>
    set((s) => {
      const m = s.markups[id];
      if (!m) return s;
      const cmd: HistoryCommand = {
        type: "UpdateStatus",
        id,
        before: m.status,
        after: status,
      };
      return {
        markups: { ...s.markups, [id]: { ...m, status } },
        history: pushCommand(s.history, cmd),
        saveState: "unsaved",
      };
    }),

  // ── Lock / Visible ────────────────────────────────────────────────────────
  setLocked: (id, locked) =>
    set((s) => {
      const m = s.markups[id];
      if (!m) return s;
      const cmd: HistoryCommand = {
        type: "SetLock",
        id,
        before: m.locked,
        after: locked,
      };
      return {
        markups: { ...s.markups, [id]: { ...m, locked } },
        history: pushCommand(s.history, cmd),
        saveState: "unsaved",
      };
    }),

  setVisible: (id, visible) =>
    set((s) => {
      const m = s.markups[id];
      if (!m) return s;
      const cmd: HistoryCommand = {
        type: "SetVisible",
        id,
        before: m.visible,
        after: visible,
      };
      return {
        markups: { ...s.markups, [id]: { ...m, visible } },
        history: pushCommand(s.history, cmd),
        saveState: "unsaved",
      };
    }),

  // ── Generic field update ──────────────────────────────────────────────────
  updateMarkupField: (id, updates) =>
    set((s) => {
      const m = s.markups[id];
      if (!m) return s;
      const next = produce(m, (draft) => {
        if (updates.style != null) {
          Object.assign(draft.style, updates.style);
        }
        if (updates.status != null) draft.status = updates.status;
        if (updates.locked != null) draft.locked = updates.locked;
        if (updates.visible != null) draft.visible = updates.visible;
        if (updates.zIndex != null) draft.zIndex = updates.zIndex;
        if (updates.label !== undefined) draft.label = updates.label ?? null;
        if (updates.comment !== undefined) draft.comment = updates.comment ?? null;
        if (updates.authorName != null) draft.authorName = updates.authorName;
      });
      return {
        markups: { ...s.markups, [id]: next as Markup },
        saveState: "unsaved",
      };
    }),

  // ── Z-order ───────────────────────────────────────────────────────────────
  bringToFront: (id) =>
    set((s) => {
      const m = s.markups[id];
      if (!m) return s;
      const maxZ = Math.max(...Object.values(s.markups).map((x) => x.zIndex), 0);
      return {
        markups: { ...s.markups, [id]: { ...m, zIndex: maxZ + 1 } },
        saveState: "unsaved",
      };
    }),

  sendToBack: (id) =>
    set((s) => {
      const m = s.markups[id];
      if (!m) return s;
      const minZ = Math.min(...Object.values(s.markups).map((x) => x.zIndex), 0);
      return {
        markups: { ...s.markups, [id]: { ...m, zIndex: minZ - 1 } },
        saveState: "unsaved",
      };
    }),

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  undo: () =>
    set((s) => {
      const result = undo(s.history, s.markups);
      if (!result) return s;
      return { markups: result.markups, history: result.stack };
    }),

  redo: () =>
    set((s) => {
      const result = redo(s.history, s.markups);
      if (!result) return s;
      return { markups: result.markups, history: result.stack };
    }),

  // ── Clipboard ─────────────────────────────────────────────────────────────
  copy: () =>
    set((s) => ({
      clipboard: s.selectedIds
        .map((id) => s.markups[id])
        .filter((m): m is Markup => m != null),
    })),

  paste: (planId, pageNumber) =>
    set((s) => {
      const OFFSET = 0.02;
      const newMarkups: Markup[] = s.clipboard.map((m) =>
        shiftAndCloneMarkup(m, planId, pageNumber, OFFSET)
      );

      let markups = { ...s.markups };
      let history = s.history;
      for (const nm of newMarkups) {
        markups[nm.id] = nm;
        history = pushCommand(history, { type: "AddMarkup", markup: nm });
      }
      return {
        markups,
        history,
        selectedIds: newMarkups.map((m) => m.id),
        saveState: "unsaved",
      };
    }),

  duplicate: (planId, pageNumber) => {
    get().copy();
    get().paste(planId, pageNumber);
  },

  // ── Bulk operations ───────────────────────────────────────────────────────
  loadMarkups: (markupList) =>
    set({
      markups: Object.fromEntries(markupList.map((m) => [m.id, m])),
      history: createHistoryStack(),
      saveState: "saved",
    }),

  upsertMarkup: (markup) =>
    set((s) => ({ markups: { ...s.markups, [markup.id]: markup } })),

  removeMarkup: (id) =>
    set((s) => {
      const next = { ...s.markups };
      delete next[id];
      return { markups: next };
    }),
}));

// ─── Internal helpers ─────────────────────────────────────────────────────────

type GeometryPatch = {
  bounds?: NormalizedBounds;
  points?: NormalizedPoint[];
  start?: NormalizedPoint;
  end?: NormalizedPoint;
  point?: NormalizedPoint;
};

function extractGeometryPatch(m: Markup): GeometryPatch {
  switch (m.kind) {
    case "bounds": return { bounds: m.bounds };
    case "path": return { points: m.points };
    case "line": return { start: m.start, end: m.end };
    case "point": return { point: m.point };
    case "text": return { point: m.point };
  }
}

function applyPatch(m: Markup, patch: GeometryPatch): Markup {
  switch (m.kind) {
    case "bounds": return patch.bounds ? { ...m, bounds: patch.bounds } : m;
    case "path": return patch.points ? { ...m, points: patch.points } : m;
    case "line":
      return {
        ...m,
        ...(patch.start ? { start: patch.start } : {}),
        ...(patch.end ? { end: patch.end } : {}),
      };
    case "point": return patch.point ? { ...m, point: patch.point } : m;
    case "text": return patch.point ? { ...m, point: patch.point } : m;
  }
}

function shiftAndCloneMarkup(
  m: Markup,
  planId: string,
  pageNumber: number,
  offset: number
): Markup {
  const base = {
    ...m,
    id: crypto.randomUUID(),
    planId,
    pageNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 1,
  };
  switch (m.kind) {
    case "bounds":
      return { ...base, kind: "bounds", tool: m.tool, bounds: { ...m.bounds, x: m.bounds.x + offset, y: m.bounds.y + offset } } as Markup;
    case "path":
      return { ...base, kind: "path", tool: m.tool, points: m.points.map((p) => ({ x: p.x + offset, y: p.y + offset })) } as Markup;
    case "line":
      return { ...base, kind: "line", tool: m.tool, start: { x: m.start.x + offset, y: m.start.y + offset }, end: { x: m.end.x + offset, y: m.end.y + offset } } as Markup;
    case "point":
      return { ...base, kind: "point", tool: m.tool, point: { x: m.point.x + offset, y: m.point.y + offset } } as Markup;
    case "text":
      return { ...base, kind: "text", tool: m.tool, point: { x: m.point.x + offset, y: m.point.y + offset }, text: m.text } as Markup;
  }
}

// Expose applyCommand for direct use in the store when loading from server
export { applyCommand };
