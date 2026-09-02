"use client";

import React from "react";
import type { MarkupStatus, MarkupStyle } from "@/lib/markup/types";
import { MARKUP_LIMITS } from "@/lib/markup/types";
import { useMarkupStore } from "@/stores/markupStore";

const STATUS_OPTIONS: { value: MarkupStatus; label: string; color: string }[] = [
  { value: "open", label: "Open", color: "#EF4444" },
  { value: "pending", label: "Pending", color: "#F59E0B" },
  { value: "resolved", label: "Resolved", color: "#22C55E" },
  { value: "void", label: "Void", color: "#6B7280" },
];

const SWATCHES = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#FFFFFF",
];

export function MarkupProperties() {
  const {
    markups,
    selectedIds,
    updateMarkupStyle,
    updateMarkupStatus,
    setLocked,
    setVisible,
    deleteMarkup,
    deleteSelected,
    bringToFront,
    sendToBack,
    duplicate,
    updateMarkupField,
  } = useMarkupStore();

  if (selectedIds.length === 0) return null;

  // If multiple selected, show summary
  if (selectedIds.length > 1) {
    return (
      <div className="p-3 border-t border-white/10">
        <p className="text-[11px] text-gray-500 uppercase font-semibold mb-2">
          {selectedIds.length} markups selected
        </p>
        <button
          onClick={deleteSelected}
          className="w-full py-1.5 text-[11px] text-red-400 bg-red-400/5 hover:bg-red-400/10 rounded"
        >
          Delete All
        </button>
      </div>
    );
  }

  const markup = markups[selectedIds[0]];
  if (!markup) return null;

  const style = markup.style;

  const patchStyle = (patch: Partial<MarkupStyle>) => {
    updateMarkupStyle(markup.id, { ...style, ...patch });
  };

  return (
    <div className="p-3 border-t border-white/10 space-y-3 overflow-y-auto">
      <p className="text-[11px] text-gray-500 uppercase font-semibold">Properties</p>

      {/* Color swatches */}
      <div>
        <label className="text-[10px] text-gray-600 uppercase block mb-1">Color</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => patchStyle({ color: c })}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                style.color === c ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
        <input
          type="text"
          value={style.color}
          onChange={(e) => /^#[0-9a-fA-F]{0,8}$/.test(e.target.value) && patchStyle({ color: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white font-mono"
          placeholder="#RRGGBB"
          maxLength={9}
        />
      </div>

      {/* Stroke width */}
      <div>
        <label className="text-[10px] text-gray-600 uppercase block mb-1">
          Stroke Width ({style.strokeWidth.toFixed(1)})
        </label>
        <input
          type="range"
          min={MARKUP_LIMITS.minStrokeWidth}
          max={MARKUP_LIMITS.maxStrokeWidth}
          step={0.5}
          value={style.strokeWidth}
          onChange={(e) => patchStyle({ strokeWidth: parseFloat(e.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Opacity */}
      <div>
        <label className="text-[10px] text-gray-600 uppercase block mb-1">
          Opacity ({Math.round(style.opacity * 100)}%)
        </label>
        <input
          type="range"
          min={MARKUP_LIMITS.minOpacity * 100}
          max={100}
          step={5}
          value={Math.round(style.opacity * 100)}
          onChange={(e) => patchStyle({ opacity: parseInt(e.target.value) / 100 })}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Font size — text only */}
      {markup.kind === "text" && (
        <div>
          <label className="text-[10px] text-gray-600 uppercase block mb-1">
            Font Size ({style.fontSize}px)
          </label>
          <input
            type="range"
            min={MARKUP_LIMITS.minFontSize}
            max={MARKUP_LIMITS.maxFontSize}
            step={1}
            value={style.fontSize}
            onChange={(e) => patchStyle({ fontSize: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
      )}

      {/* Status */}
      <div>
        <label className="text-[10px] text-gray-600 uppercase block mb-1">Status</label>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateMarkupStatus(markup.id, s.value)}
              className={`flex-1 py-1 text-[9px] rounded capitalize transition-colors ${
                markup.status === s.value ? "text-white font-semibold" : "text-gray-500 bg-white/5"
              }`}
              style={markup.status === s.value ? { background: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div>
        <label className="text-[10px] text-gray-600 uppercase block mb-1">Label</label>
        <input
          type="text"
          value={markup.label ?? ""}
          onChange={(e) => updateMarkupField(markup.id, { label: e.target.value || null })}
          maxLength={500}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white"
          placeholder="Optional label…"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="text-[10px] text-gray-600 uppercase block mb-1">Comment</label>
        <textarea
          value={markup.comment ?? ""}
          onChange={(e) => updateMarkupField(markup.id, { comment: e.target.value || null })}
          rows={3}
          maxLength={5000}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white resize-none"
          placeholder="Add comment…"
        />
      </div>

      {/* Lock / Visible toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => setLocked(markup.id, !markup.locked)}
          className={`flex-1 py-1.5 text-[10px] rounded transition-colors ${
            markup.locked ? "bg-yellow-500/20 text-yellow-300" : "bg-white/5 text-gray-400"
          }`}
        >
          {markup.locked ? "🔒 Locked" : "🔓 Lock"}
        </button>
        <button
          onClick={() => setVisible(markup.id, !markup.visible)}
          className={`flex-1 py-1.5 text-[10px] rounded transition-colors ${
            markup.visible ? "bg-white/5 text-gray-400" : "bg-gray-500/20 text-gray-500"
          }`}
        >
          {markup.visible ? "👁 Visible" : "🙈 Hidden"}
        </button>
      </div>

      {/* Z-order */}
      <div className="flex gap-2">
        <button
          onClick={() => bringToFront(markup.id)}
          className="flex-1 py-1 text-[10px] text-gray-400 bg-white/5 rounded hover:bg-white/10"
        >
          ↑ Front
        </button>
        <button
          onClick={() => sendToBack(markup.id)}
          className="flex-1 py-1 text-[10px] text-gray-400 bg-white/5 rounded hover:bg-white/10"
        >
          ↓ Back
        </button>
      </div>

      {/* Duplicate / Delete */}
      <div className="flex gap-2">
        <button
          onClick={() => duplicate(markup.planId, markup.pageNumber)}
          className="flex-1 py-1.5 text-[10px] text-blue-400 bg-blue-400/5 hover:bg-blue-400/10 rounded"
        >
          Duplicate
        </button>
        <button
          onClick={() => deleteMarkup(markup.id)}
          className="flex-1 py-1.5 text-[10px] text-red-400 bg-red-400/5 hover:bg-red-400/10 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
