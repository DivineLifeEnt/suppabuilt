"use client";

import React, { useState } from "react";
import { useMeasurementStore } from "@/stores/measurementStore";
import type { Calibration } from "@/lib/measurement/types";
import { RescalePreviewDialog } from "./RescalePreviewDialog";

interface Props {
  planId: string;
  pageNumber: number;
}

export function CalibrationManager({ planId, pageNumber }: Props) {
  const { calibrations, pageCalibration, loadCalibrations, deleteCalibration: removeFromStore } = useMeasurementStore();
  const [rescaling, setRescaling] = useState<Calibration | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Get calibrations for this page + document-level ones
  const pageCals = Object.values(calibrations).filter(
    (c) => c.pageNumber === pageNumber || c.pageNumber === null
  );

  const activeId = pageCalibration[pageNumber];
  const activeCal = activeId ? calibrations[activeId] : null;

  const handleDelete = async (cal: Calibration) => {
    if (!confirm(`Delete calibration "${cal.id.slice(0, 8)}…"? Measurements using it will become uncalibrated.`)) return;
    setDeleting(cal.id);
    try {
      const res = await fetch(`/api/calibrations/${cal.id}`, { method: "DELETE" });
      if (res.status === 409) {
        if (confirm("Measurements reference this calibration. Force delete?")) {
          const res2 = await fetch(`/api/calibrations/${cal.id}?force=true`, { method: "DELETE" });
          if (res2.ok) removeFromStore(cal.id);
        }
      } else if (res.ok) {
        removeFromStore(cal.id);
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleRescaled = async (updated: Calibration) => {
    // Reload calibrations from server
    const res = await fetch(`/api/plans/${planId}/calibrations`);
    const data = (await res.json()) as { calibrations?: Calibration[] };
    if (data.calibrations) loadCalibrations(data.calibrations);
    setRescaling(null);
    void updated;
  };

  if (pageCals.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-[11px] text-[#64717e]">
        No calibrations set for this sheet.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-2">
      {pageCals.map((cal) => {
        const isActive = cal.id === activeCal?.id;
        return (
          <div
            key={cal.id}
            className={[
              "flex items-center gap-2 rounded-lg border px-3 py-2",
              isActive
                ? "border-[#ff6a1a]/40 bg-[#ff6a1a]/8"
                : "border-[#222c36] bg-[#0d131a]",
            ].join(" ")}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {isActive && <span className="size-1.5 shrink-0 rounded-full bg-[#ff6a1a]" />}
                <span className="text-[11px] font-semibold text-white truncate">
                  {cal.pageNumber === null ? "Document default" : `Sheet ${cal.pageNumber}`}
                </span>
              </div>
              <div className="text-[10px] text-[#64717e] mt-0.5">
                {cal.pageUnitsPerMillimeter.toExponential(4)} upm · {cal.displayUnit}
              </div>
            </div>
            <button
              title="Rescale measurements"
              onClick={() => setRescaling(cal)}
              className="tool-button !h-6 !min-w-6 !px-1 text-[11px]"
            >
              ⚖
            </button>
            <button
              title="Delete calibration"
              disabled={deleting === cal.id}
              onClick={() => void handleDelete(cal)}
              className="tool-button !h-6 !min-w-6 !px-1 text-[11px] hover:!text-[#f87171]"
            >
              ✕
            </button>
          </div>
        );
      })}

      {rescaling && (
        <RescalePreviewDialog
          planId={planId}
          calibration={rescaling}
          onApplied={handleRescaled}
          onCancel={() => setRescaling(null)}
        />
      )}
    </div>
  );
}
