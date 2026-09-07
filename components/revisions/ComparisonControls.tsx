"use client";

import { useRevisionsStore } from "@/stores/revisionsStore";
import type { ComparisonMode } from "@/lib/revisions/types";

const MODES: { value: ComparisonMode; label: string }[] = [
  { value: "side-by-side", label: "Side by Side" },
  { value: "slider", label: "Slider" },
  { value: "blink", label: "Blink" },
  { value: "overlay", label: "Overlay" },
  { value: "difference", label: "Difference" },
];

export function ComparisonControls() {
  const {
    comparisonMode,
    comparisonOpacity,
    blinkIntervalMs,
    navigationLinked,
    setComparisonMode,
    setComparisonOpacity,
    setBlinkIntervalMs,
    setNavigationLinked,
    resetView,
  } = useRevisionsStore();

  return (
    <div className="flex items-center gap-4 p-3 border-b bg-white text-sm">
      {/* Mode selector */}
      <div className="flex gap-1">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setComparisonMode(mode.value)}
            className={`px-3 py-1 rounded text-xs ${
              comparisonMode === mode.value
                ? "bg-blue-600 text-white"
                : "border hover:bg-gray-50"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="h-4 border-l" />

      {/* Opacity (visible for overlay/blink modes) */}
      {(comparisonMode === "overlay" || comparisonMode === "slider") && (
        <label className="flex items-center gap-2 text-xs">
          Opacity
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={comparisonOpacity}
            onChange={(e) => setComparisonOpacity(Number(e.target.value))}
            className="w-24"
          />
          <span className="w-8 text-right">{Math.round(comparisonOpacity * 100)}%</span>
        </label>
      )}

      {/* Blink speed */}
      {comparisonMode === "blink" && (
        <label className="flex items-center gap-2 text-xs">
          Blink speed
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={blinkIntervalMs}
            onChange={(e) => setBlinkIntervalMs(Number(e.target.value))}
            className="w-24"
          />
          <span className="w-12 text-right">{blinkIntervalMs}ms</span>
        </label>
      )}

      <div className="h-4 border-l" />

      {/* Linked navigation */}
      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={navigationLinked}
          onChange={(e) => setNavigationLinked(e.target.checked)}
          className="rounded"
        />
        Linked nav
      </label>

      {/* Reset view */}
      <button
        onClick={resetView}
        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border rounded"
      >
        Reset view
      </button>
    </div>
  );
}
