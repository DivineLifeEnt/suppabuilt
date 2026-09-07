"use client";

import { useRevisionsStore } from "@/stores/revisionsStore";

type Props = {
  diffMaskUrl?: string;
  diffOverlayUrl?: string;
};

type DiffDisplayMode = "overlay" | "mask";

import { useState } from "react";

export function DifferenceView({ diffMaskUrl, diffOverlayUrl }: Props) {
  const { zoom, panX, panY } = useRevisionsStore();
  const [displayMode, setDisplayMode] = useState<DiffDisplayMode>("overlay");
  const transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;

  const activeUrl = displayMode === "overlay" ? diffOverlayUrl : diffMaskUrl;

  return (
    <div className="relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden">
      <div style={{ transform, transformOrigin: "center", transition: "transform 0.1s" }} className="w-full h-full flex items-center justify-center">
        {activeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeUrl}
            alt="Difference"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-gray-400 text-sm">
            No difference image — run a comparison first
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        <button
          onClick={() => setDisplayMode("overlay")}
          className={`text-xs px-2 py-0.5 rounded shadow ${
            displayMode === "overlay" ? "bg-blue-600 text-white" : "bg-white text-gray-800"
          }`}
        >
          Color overlay
        </button>
        <button
          onClick={() => setDisplayMode("mask")}
          className={`text-xs px-2 py-0.5 rounded shadow ${
            displayMode === "mask" ? "bg-blue-600 text-white" : "bg-white text-gray-800"
          }`}
        >
          Mask
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-10 flex gap-3 text-xs bg-black bg-opacity-60 text-white px-3 py-1.5 rounded">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#FF00FF" }} />
          Removed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#00FFFF" }} />
          Added
        </span>
      </div>
    </div>
  );
}
