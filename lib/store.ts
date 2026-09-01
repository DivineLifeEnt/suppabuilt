import { create } from "zustand";

export type Tool =
  | "select" | "pan" | "text" | "highlight"
  | "cloud" | "rectangle" | "circle" | "arrow"
  | "freehand" | "length" | "area" | "count"
  | "equipment" | "calibrate";

export interface MarkupShape {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  color: string;
  strokeWidth: number;
  page: number;
  status: "open" | "pending" | "resolved" | "void";
  label?: string;
  authorName?: string;
  comment?: string;
  assignedTo?: string;
  equipmentId?: string;
  count?: number;
  measurementFt?: number;
}

export interface CountItem {
  equipmentId: string;
  name: string;
  abbreviation: string;
  color: string;
  count: number;
}

interface StudioState {
  tool: Tool;
  activePage: number;
  totalPages: number;
  scale: number; // feet per pixel
  zoom: number;
  markups: MarkupShape[];
  selectedId: string | null;
  activeColor: string;
  strokeWidth: number;
  showMarkupPanel: boolean;
  selectedEquipmentId: string | null;
  counts: CountItem[];
  calibrated: boolean;

  setTool: (tool: Tool) => void;
  setPage: (page: number) => void;
  setTotalPages: (n: number) => void;
  setScale: (scale: number) => void;
  setZoom: (zoom: number) => void;
  addMarkup: (markup: MarkupShape) => void;
  updateMarkup: (id: string, updates: Partial<MarkupShape>) => void;
  deleteMarkup: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setActiveColor: (color: string) => void;
  setStrokeWidth: (w: number) => void;
  setShowMarkupPanel: (v: boolean) => void;
  setSelectedEquipmentId: (id: string | null) => void;
  incrementCount: (equipmentId: string, name: string, abbreviation: string, color: string) => void;
  decrementCount: (equipmentId: string) => void;
  setCalibrated: (v: boolean) => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  tool: "select",
  activePage: 1,
  totalPages: 1,
  scale: 0,
  zoom: 1,
  markups: [],
  selectedId: null,
  activeColor: "#EF4444",
  strokeWidth: 2,
  showMarkupPanel: true,
  selectedEquipmentId: null,
  counts: [],
  calibrated: false,

  setTool: (tool) => set({ tool, selectedId: null }),
  setPage: (page) => set({ activePage: page }),
  setTotalPages: (n) => set({ totalPages: n }),
  setScale: (scale) => set({ scale, calibrated: scale > 0 }),
  setZoom: (zoom) => set({ zoom }),
  addMarkup: (markup) => set((s) => ({ markups: [...s.markups, markup] })),
  updateMarkup: (id, updates) =>
    set((s) => ({ markups: s.markups.map((m) => m.id === id ? { ...m, ...updates } : m) })),
  deleteMarkup: (id) => set((s) => ({ markups: s.markups.filter((m) => m.id !== id), selectedId: null })),
  setSelectedId: (id) => set({ selectedId: id }),
  setActiveColor: (color) => set({ activeColor: color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setShowMarkupPanel: (showMarkupPanel) => set({ showMarkupPanel }),
  setSelectedEquipmentId: (id) => set({ selectedEquipmentId: id }),
  incrementCount: (equipmentId, name, abbreviation, color) =>
    set((s) => {
      const existing = s.counts.find(c => c.equipmentId === equipmentId);
      if (existing) {
        return { counts: s.counts.map(c => c.equipmentId === equipmentId ? { ...c, count: c.count + 1 } : c) };
      }
      return { counts: [...s.counts, { equipmentId, name, abbreviation, color, count: 1 }] };
    }),
  decrementCount: (equipmentId) =>
    set((s) => ({
      counts: s.counts
        .map(c => c.equipmentId === equipmentId ? { ...c, count: Math.max(0, c.count - 1) } : c)
        .filter(c => c.count > 0),
    })),
  setCalibrated: (calibrated) => set({ calibrated }),
}));
