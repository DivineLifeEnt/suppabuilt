"use client";

import { useState } from "react";
import type { AISuggestion } from "@/lib/ai/types";
import { SuggestionCard } from "./SuggestionCard";
import { confidenceLabel } from "@/lib/ai/confidence";

type StatusFilter = "all" | "pending" | "accepted" | "rejected";
type ConfidenceFilter = "all" | "high" | "medium" | "low";

interface Props {
  suggestions: AISuggestion[];
}

export function SuggestionList({ suggestions }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");

  const filtered = suggestions.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (confidenceFilter !== "all" && confidenceLabel(s.confidence) !== confidenceFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 font-medium">Status:</label>
          {(["all", "pending", "accepted", "rejected"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 font-medium">Confidence:</label>
          {(["all", "high", "medium", "low"] as ConfidenceFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setConfidenceFilter(f)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors ${
                confidenceFilter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No suggestions match the current filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {suggestions.length} suggestions
      </p>
    </div>
  );
}
