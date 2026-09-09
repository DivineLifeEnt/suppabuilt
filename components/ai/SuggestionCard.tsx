"use client";

import { useState } from "react";
import type { AISuggestion } from "@/lib/ai/types";
import { SuggestionConfidenceBadge } from "./SuggestionConfidenceBadge";
import { AcceptSuggestionDialog } from "./AcceptSuggestionDialog";
import { useAIStore } from "@/stores/aiStore";

interface Props {
  suggestion: AISuggestion;
}

export function SuggestionCard({ suggestion }: Props) {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const acceptSuggestion = useAIStore((s) => s.acceptSuggestion);
  const rejectSuggestion = useAIStore((s) => s.rejectSuggestion);

  const isPending = suggestion.status === "pending";

  const handleAccept = async (takeoffInput: { qty: number; unit: string; description: string }) => {
    await acceptSuggestion(suggestion.id, takeoffInput);
  };

  const handleReject = async () => {
    await rejectSuggestion(suggestion.id);
  };

  const statusColor = {
    pending: "border-gray-200",
    accepted: "border-green-200 bg-green-50",
    rejected: "border-red-200 bg-red-50",
    superseded: "border-gray-200 bg-gray-50",
  }[suggestion.status];

  return (
    <>
      <div className={`rounded-lg border p-4 space-y-3 ${statusColor}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{suggestion.description}</p>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">
              {suggestion.kind.replace("_", " ")}
              {suggestion.symbolType ? ` · ${suggestion.symbolType}` : ""}
              {suggestion.qty != null ? ` · ${suggestion.qty} ${suggestion.unit ?? ""}` : ""}
            </p>
          </div>
          <SuggestionConfidenceBadge confidence={suggestion.confidence} />
        </div>

        {suggestion.boundingBox && (
          <p className="text-xs text-gray-400">
            Box: ({(suggestion.boundingBox.x * 100).toFixed(1)}%,{" "}
            {(suggestion.boundingBox.y * 100).toFixed(1)}%) — {(suggestion.boundingBox.w * 100).toFixed(1)}% ×{" "}
            {(suggestion.boundingBox.h * 100).toFixed(1)}%
          </p>
        )}

        {suggestion.status === "accepted" && (
          <p className="text-xs text-green-700 font-medium">✓ Added to takeoff</p>
        )}
        {suggestion.status === "rejected" && (
          <p className="text-xs text-red-600 font-medium">✗ Rejected</p>
        )}
        {suggestion.status === "superseded" && (
          <p className="text-xs text-gray-500 font-medium">Superseded</p>
        )}

        {isPending && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowAcceptDialog(true)}
              className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              Accept
            </button>
            <button
              onClick={handleReject}
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {showAcceptDialog && (
        <AcceptSuggestionDialog
          suggestion={suggestion}
          onConfirm={handleAccept}
          onClose={() => setShowAcceptDialog(false)}
        />
      )}
    </>
  );
}
