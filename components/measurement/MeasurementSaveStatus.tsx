"use client";

import React from "react";
import { useMeasurementStore } from "@/stores/measurementStore";
import type { MeasurementSaveState } from "@/stores/measurementStore";

const STATE_CONFIG: Record<MeasurementSaveState, { label: string; dotClass: string; showRetry?: boolean }> = {
  saved: { label: "M-Saved", dotClass: "bg-green-400" },
  saving: { label: "M-Saving…", dotClass: "bg-yellow-400 animate-pulse" },
  unsaved: { label: "M-Unsaved", dotClass: "bg-yellow-500" },
  failed: { label: "M-Save failed", dotClass: "bg-red-500", showRetry: true },
  offline: { label: "M-Offline", dotClass: "bg-gray-500", showRetry: true },
};

export function MeasurementSaveStatus() {
  const { saveState } = useMeasurementStore();
  const config = STATE_CONFIG[saveState];

  return (
    <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
      <span className={`size-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
      {config.showRetry && (
        <button
          className="ml-1 underline text-blue-400 hover:text-blue-300"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      )}
    </span>
  );
}
