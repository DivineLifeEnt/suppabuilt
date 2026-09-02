"use client";

import React from "react";
import type { SaveState } from "@/stores/markupStore";
import { useMarkupStore } from "@/stores/markupStore";

const STATE_CONFIG: Record<
  SaveState,
  { label: string; dotClass: string; showRetry?: boolean }
> = {
  saved: { label: "Saved", dotClass: "bg-green-400" },
  saving: { label: "Saving…", dotClass: "bg-yellow-400 animate-pulse" },
  unsaved: { label: "Unsaved", dotClass: "bg-yellow-500" },
  failed: { label: "Save failed", dotClass: "bg-red-500", showRetry: true },
  offline: { label: "Offline", dotClass: "bg-gray-500", showRetry: true },
};

export function MarkupSaveStatus() {
  const { saveState } = useMarkupStore();
  const config = STATE_CONFIG[saveState];

  return (
    <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
      <span className={`size-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
      {config.showRetry && (
        <button
          className="ml-1 underline text-blue-400 hover:text-blue-300"
          onClick={() => {
            // Retry by re-triggering a page reload of markups — simple strategy
            window.location.reload();
          }}
        >
          Retry
        </button>
      )}
    </span>
  );
}
