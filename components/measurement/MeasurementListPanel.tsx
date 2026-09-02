"use client";

import React, { useMemo } from "react";
import { useMeasurementStore } from "@/stores/measurementStore";
import { formatMeasurementQuantity } from "@/lib/measurement/formatting";
import type { Calibration } from "@/lib/measurement/types";

const TYPE_ICON: Record<string, string> = {
  linear: "↔",
  polyline: "〜",
  perimeter: "□",
  "polygon-area": "⬟",
  "rectangle-area": "▬",
  volume: "⬡",
  radius: "◌",
  diameter: "◎",
  angle: "∠",
  count: "#",
};

interface Props {
  pageNumber: number;
  calibration: Calibration | null;
}

export function MeasurementListPanel({ pageNumber, calibration }: Props) {
  const {
    measurements,
    selectedIds,
    filter,
    sortBy,
    selectOne,
    selectAdd,
    deleteMeasurement,
    setSortBy,
  } = useMeasurementStore();

  const items = useMemo(() => {
    const all = Object.values(measurements).filter((m) => {
      if (m.pageNumber !== pageNumber) return false;
      if (filter.status && m.status !== filter.status) return false;
      if (filter.type && m.type !== filter.type) return false;
      if (filter.groupId && m.groupId !== filter.groupId) return false;
      return true;
    });

    return [...all].sort((a, b) => {
      if (sortBy === "createdAt") return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === "type") return a.type.localeCompare(b.type);
      return a.zIndex - b.zIndex;
    });
  }, [measurements, pageNumber, filter, sortBy]);

  if (items.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-[11px] text-[#64717e]">
        No measurements on this sheet yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Sort bar */}
      <div className="flex items-center gap-1 border-b border-[#222c36] px-2 py-1">
        <span className="text-[9px] text-[#64717e] mr-1">SORT</span>
        {(["zIndex", "type", "createdAt"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={[
              "rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors",
              sortBy === s ? "bg-[#ff6a1a]/20 text-[#ff7a32]" : "text-[#64717e] hover:text-white",
            ].join(" ")}
          >
            {s === "zIndex" ? "Order" : s === "createdAt" ? "Date" : "Type"}
          </button>
        ))}
        <span className="ml-auto text-[9px] text-[#64717e]">{items.length}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.map((m) => {
          const isSelected = selectedIds.includes(m.id);
          const quantity = formatMeasurementQuantity(m, calibration);
          return (
            <div
              key={m.id}
              className={[
                "flex items-center gap-2 border-b border-[#141d25] px-2 py-1.5 cursor-pointer transition-colors",
                isSelected
                  ? "bg-[#ff6a1a]/10"
                  : "hover:bg-[#151d26]",
              ].join(" ")}
              onClick={(e) => (e.shiftKey ? selectAdd(m.id) : selectOne(m.id))}
            >
              <span className="shrink-0 text-[13px] text-[#64717e]">
                {TYPE_ICON[m.type] ?? "·"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  {m.label && (
                    <span className="truncate text-[11px] text-white">{m.label}</span>
                  )}
                  <span className={["text-[11px] font-mono font-semibold", isSelected ? "text-[#ff7a32]" : "text-[#8895a2]"].join(" ")}>
                    {quantity}
                  </span>
                </div>
                <div className="text-[9px] text-[#556370] capitalize">{m.type}</div>
              </div>
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMeasurement(m.id);
                    void fetch(`/api/measurements/${m.id}`, { method: "DELETE" });
                  }}
                  className="shrink-0 text-[10px] text-[#556370] hover:text-[#f87171] transition-colors"
                  title="Delete"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
