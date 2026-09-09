"use client";

import { useEffect } from "react";
import { useAIStore } from "@/stores/aiStore";
import { AIRunButton } from "./AIRunButton";
import { AIRunProgress } from "./AIRunProgress";
import { AIRunStatusBadge } from "./AIRunStatusBadge";
import { SuggestionList } from "./SuggestionList";
import { BulkReviewToolbar } from "./BulkReviewToolbar";
import { AIEmptyState } from "./AIEmptyState";

interface Props {
  sessionId: string;
  pageIds?: string[];
  aiEnabled?: boolean;
}

export function AIAnalysisPanel({ sessionId, pageIds = [], aiEnabled = false }: Props) {
  const runs = useAIStore((s) => s.runs);
  const suggestions = useAIStore((s) => s.suggestions);
  const sessionSuggestions = useAIStore((s) => s.sessionSuggestions);
  const pendingCount = useAIStore((s) => s.pendingCount);
  const isLoading = useAIStore((s) => s.isLoading);
  const fetchSessionSuggestions = useAIStore((s) => s.fetchSessionSuggestions);

  useEffect(() => {
    if (aiEnabled) {
      fetchSessionSuggestions(sessionId);
    }
  }, [sessionId, aiEnabled, fetchSessionSuggestions]);

  // Get the latest run for this session
  const sessionRunIds = Array.from(runs.values())
    .filter((r) => r.sessionId === sessionId)
    .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0));

  const latestRun = sessionRunIds[0];

  // Get suggestions for this session
  const suggestionIds = sessionSuggestions.get(sessionId) ?? [];
  const sessionSuggestionList = suggestionIds
    .map((id) => suggestions.get(id))
    .filter(Boolean) as import("@/lib/ai/types").AISuggestion[];

  const hasRuns = sessionRunIds.length > 0;
  const hasSuggestions = sessionSuggestionList.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI Analysis</h2>
          {pendingCount > 0 && (
            <p className="text-xs text-blue-600">{pendingCount} pending review</p>
          )}
        </div>
        <AIRunButton
          sessionId={sessionId}
          pageIds={pageIds}
          aiEnabled={aiEnabled}
          onRunStarted={() => fetchSessionSuggestions(sessionId)}
        />
      </div>

      {/* Run status */}
      {latestRun && (
        <div className="mb-4 rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Latest run</span>
            <AIRunStatusBadge status={latestRun.status} />
          </div>
          {(latestRun.status === "running" || latestRun.status === "queued") && (
            <AIRunProgress run={latestRun} />
          )}
          {latestRun.status === "failed" && latestRun.errorMessage && (
            <p className="text-xs text-red-600">{latestRun.errorMessage}</p>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && !hasRuns && (
        <div className="flex items-center justify-center py-8">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasRuns && (
        <AIEmptyState
          onStartAnalysis={aiEnabled ? () => fetchSessionSuggestions(sessionId) : undefined}
        />
      )}

      {/* Suggestions */}
      {hasSuggestions && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <BulkReviewToolbar suggestions={sessionSuggestionList} />
          <SuggestionList suggestions={sessionSuggestionList} />
        </div>
      )}
    </div>
  );
}
