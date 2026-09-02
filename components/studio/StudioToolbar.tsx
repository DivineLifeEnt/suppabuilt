"use client";

import { useMarkupStore } from "@/stores/markupStore";
import { useStudioStore } from "@/lib/store";
import type { MarkupTool } from "@/lib/markup/types";

type ToolDef = { id: MarkupTool; label: string; icon: string; shortcut?: string };

const TOOL_GROUPS: { label: string; tools: ToolDef[] }[] = [
  {
    label: "Navigate",
    tools: [
      { id: "select", label: "Select", icon: "↖", shortcut: "V" },
      { id: "pan", label: "Pan", icon: "✋", shortcut: "H" },
    ],
  },
  {
    label: "Draw",
    tools: [
      { id: "text", label: "Text", icon: "T", shortcut: "T" },
      { id: "pen", label: "Pen", icon: "✏", shortcut: "P" },
      { id: "highlighter", label: "Highlight", icon: "◻" },
      { id: "line", label: "Line", icon: "—", shortcut: "L" },
      { id: "arrow", label: "Arrow", icon: "→", shortcut: "A" },
      { id: "rectangle", label: "Rect", icon: "▭", shortcut: "R" },
      { id: "ellipse", label: "Ellipse", icon: "○", shortcut: "E" },
      { id: "cloud", label: "Cloud", icon: "☁" },
    ],
  },
  {
    label: "Symbols",
    tools: [
      { id: "checkmark", label: "Check", icon: "✓" },
      { id: "cross", label: "Cross", icon: "✕" },
      { id: "pin", label: "Pin", icon: "📍" },
    ],
  },
  {
    label: "Edit",
    tools: [
      { id: "eraser", label: "Erase", icon: "⌫" },
    ],
  },
];

const COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#FFFFFF",
];

export default function StudioToolbar() {
  const {
    tool,
    setTool,
    activeColor,
    setActiveColor,
    strokeWidth,
    setStrokeWidth,
    opacity,
    setOpacity,
    history,
    undo,
    redo,
  } = useMarkupStore();

  const { zoom, setZoom } = useStudioStore();

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return (
    <div className="h-12 bg-[#191d21] border-b border-white/10 flex items-center px-3 gap-2 overflow-x-auto shrink-0">
      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          ↩
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          ↪
        </button>
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Tool groups */}
      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1">
          {gi > 0 && <div className="w-px h-5 bg-white/10 mx-0.5" />}
          {group.tools.map((t) => (
            <button
              key={t.id}
              title={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
              onClick={() => setTool(t.id)}
              className={`relative h-8 px-2 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                tool === t.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-[13px]">{t.icon}</span>
              <span className="text-[11px] hidden lg:inline">{t.label}</span>
              {t.shortcut && (
                <span className="text-[9px] text-blue-300 hidden xl:inline ml-0.5">
                  {t.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Color picker */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setActiveColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              activeColor === c ? "border-white scale-110" : "border-transparent"
            }`}
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Stroke width */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-500 hidden sm:inline">W</span>
        {[1, 2, 3, 5].map((w) => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            className={`w-7 h-6 flex items-center justify-center rounded text-[11px] transition-colors ${
              strokeWidth === w ? "bg-blue-500 text-white" : "text-gray-400 hover:bg-white/10"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Opacity */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-500 hidden sm:inline">Opacity</span>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={Math.round(opacity * 100)}
          onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
          className="w-16 accent-blue-500"
          title={`Opacity: ${Math.round(opacity * 100)}%`}
        />
        <span className="text-[10px] text-gray-500 w-7 text-right">
          {Math.round(opacity * 100)}%
        </span>
      </div>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded text-sm"
        >
          −
        </button>
        <span className="text-[11px] text-gray-400 w-11 text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(Math.min(4, zoom + 0.25))}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded text-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}
