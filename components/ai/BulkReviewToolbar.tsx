"use client";

import { useState } from "react";
import type { AISuggestion } from "@/lib/ai/types";
import { isHighConfidence, isLowConfidence } from "@/lib/ai/confidence";
import { useAIStore } from "@/stores/aiStore";

interface Props {
  suggestions: AISuggestion[];
}

export function BulkReviewToolbar({ suggestions }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const acceptSuggestion = useAIStore((s) => s.acceptSuggestion);
  const rejectSuggestion = useAIStore((s) => s.rejectSuggestion);

  const pending = suggestions.filter((s) => s.status === "pending");
  const highConfPending = pending.filter((s) => isHighConfidence(s.confidence));
  const lowConfPending = pending.filter((s) => isLowConfidence(s.confidence));

  const handleAcceptHighConfidence = async () => {
    if (highConfPending.length === 0) return;
    const confirmed = window.confirm(
      `Accept all ${highConfPending.length} high-confidence suggestion(s) to takeoff?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      for (const s of highConfPending) {
        await acceptSuggestion(s.id, {
          qty: s.qty ?? 1,
          unit: s.unit ?? "ea",
          description: s.description,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectLowConfidence = async () => {
    if (lowConfPending.length === 0) return;
    const confirmed = window.confirm(
      `Reject all ${lowConfPending.length} low-confidence suggestion(s)?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      for (const s of lowConfPending) {
        await rejectSuggestion(s.id);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <span className="text-xs text-gray-500 font-medium">{pending.length} pending</span>

      <button
        onClick={handleAcceptHighConfidence}
        disabled={isProcessing || highConfPending.length === 0}
        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Accept All High Confidence ({highConfPending.length})
      </button>

      <button
        onClick={handleRejectLowConfidence}
        disabled={isProcessing || lowConfPending.length === 0}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Reject All Low Confidence ({lowConfPending.length})
      </button>

      {isProcessing && (
        <span className="text-xs text-gray-500 animate-pulse">Processing…</span>
      )}
    </div>
  );
}
