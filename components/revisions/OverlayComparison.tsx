"use client";

import { useRevisionsStore } from "@/stores/revisionsStore";

type Props = {
  baseImageUrl?: string;
  compImageUrl?: string;
};

export function OverlayComparison({ baseImageUrl, compImageUrl }: Props) {
  const { comparisonOpacity, zoom, panX, panY } = useRevisionsStore();
  const transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;

  return (
    <div className="relative w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden">
      <div style={{ transform, transformOrigin: "center", transition: "transform 0.1s" }} className="relative w-full h-full flex items-center justify-center">
        {/* Base layer */}
        {baseImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={baseImageUrl}
            alt="Base"
            className="absolute max-w-full max-h-full object-contain"
          />
        )}

        {/* Comparison layer */}
        {compImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={compImageUrl}
            alt="Comparison"
            className="absolute max-w-full max-h-full object-contain"
            style={{ opacity: comparisonOpacity, mixBlendMode: "multiply" }}
          />
        )}
      </div>

      <div className="absolute top-2 left-2 text-xs bg-white px-2 py-0.5 rounded shadow z-10">
        Overlay — opacity: {Math.round(comparisonOpacity * 100)}%
      </div>
    </div>
  );
}
