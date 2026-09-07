"use client";

import { useRevisionsStore } from "@/stores/revisionsStore";

type Props = {
  baseImageUrl?: string;
  compImageUrl?: string;
};

export function SideBySideComparison({ baseImageUrl, compImageUrl }: Props) {
  const { zoom, panX, panY, navigationLinked, setZoom, setPan } = useRevisionsStore();

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(zoom * delta);
  }

  const transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;

  return (
    <div className="flex h-full" onWheel={handleWheel}>
      {/* Base */}
      <div className="flex-1 overflow-hidden border-r relative bg-gray-100">
        <div className="absolute top-2 left-2 text-xs bg-white px-2 py-0.5 rounded shadow z-10">
          Base
        </div>
        <div style={{ transform, transformOrigin: "center", transition: "transform 0.1s" }} className="w-full h-full flex items-center justify-center">
          {baseImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={baseImageUrl} alt="Base page" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-gray-300">No base render available</div>
          )}
        </div>
      </div>

      {/* Comparison */}
      <div className="flex-1 overflow-hidden relative bg-gray-100">
        <div className="absolute top-2 left-2 text-xs bg-white px-2 py-0.5 rounded shadow z-10">
          Comparison
        </div>
        <div style={{ transform: navigationLinked ? transform : undefined, transformOrigin: "center", transition: "transform 0.1s" }} className="w-full h-full flex items-center justify-center">
          {compImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={compImageUrl} alt="Comparison page" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-gray-300">No comparison render available</div>
          )}
        </div>
      </div>
    </div>
  );
}
