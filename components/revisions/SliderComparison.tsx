"use client";

import { useState } from "react";
import { useRevisionsStore } from "@/stores/revisionsStore";

type Props = {
  baseImageUrl?: string;
  compImageUrl?: string;
};

export function SliderComparison({ baseImageUrl, compImageUrl }: Props) {
  const [sliderX, setSliderX] = useState(50); // percent
  const { comparisonOpacity } = useRevisionsStore();

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderX(Math.max(0, Math.min(100, x)));
  }

  return (
    <div
      className="relative w-full h-full bg-gray-100 overflow-hidden select-none cursor-col-resize"
      onMouseMove={handleMouseMove}
    >
      {/* Base (full width behind) */}
      {baseImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={baseImageUrl}
          alt="Base"
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}

      {/* Comparison (clipped to left portion) */}
      {compImageUrl && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderX}%`, opacity: comparisonOpacity }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={compImageUrl}
            alt="Comparison"
            className="absolute left-0 top-0 h-full object-contain"
            style={{ width: `${10000 / sliderX}%`, maxWidth: "none" }}
          />
        </div>
      )}

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${sliderX}%` }}
      >
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow border flex items-center justify-center text-xs">
          ↔
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 text-xs bg-white px-2 py-0.5 rounded shadow z-10">Base</div>
      <div className="absolute top-2 right-2 text-xs bg-white px-2 py-0.5 rounded shadow z-10">Comparison</div>
    </div>
  );
}
