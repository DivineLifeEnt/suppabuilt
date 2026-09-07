"use client";

import { useEffect, useState } from "react";
import { useRevisionsStore } from "@/stores/revisionsStore";

type Props = {
  baseImageUrl?: string;
  compImageUrl?: string;
};

export function BlinkComparison({ baseImageUrl, compImageUrl }: Props) {
  const { blinkIntervalMs, zoom, panX, panY } = useRevisionsStore();
  const [showBase, setShowBase] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setShowBase((v) => !v), blinkIntervalMs);
    return () => clearInterval(id);
  }, [blinkIntervalMs]);

  const transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;

  const activeUrl = showBase ? baseImageUrl : compImageUrl;
  const label = showBase ? "Base" : "Comparison";

  return (
    <div className="relative w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden">
      <div style={{ transform, transformOrigin: "center", transition: "transform 0.1s" }} className="w-full h-full flex items-center justify-center">
        {activeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeUrl}
            alt={label}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-gray-300">No image available</div>
        )}
      </div>

      <div className="absolute top-2 left-2 z-10">
        <span
          className={`text-xs px-2 py-0.5 rounded shadow font-medium ${
            showBase ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
          }`}
        >
          {label}
        </span>
      </div>

      <div className="absolute bottom-2 left-2 z-10 text-xs text-gray-500 bg-white px-2 py-0.5 rounded shadow">
        Blink: {blinkIntervalMs}ms
      </div>
    </div>
  );
}
