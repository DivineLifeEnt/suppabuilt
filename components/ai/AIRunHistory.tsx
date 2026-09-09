"use client";

import type { AIAnalysisRun } from "@/lib/ai/types";
import { AIRunStatusBadge } from "./AIRunStatusBadge";

interface Props {
  runs: AIAnalysisRun[];
}

export function AIRunHistory({ runs }: Props) {
  if (runs.length === 0) {
    return <p className="py-4 text-sm text-gray-500">No analysis runs yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Pages</th>
            <th className="py-2 pr-4">Suggestions</th>
            <th className="py-2 pr-4">Cost</th>
            <th className="py-2 pr-4">Started</th>
            <th className="py-2">Provider</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {runs.map((run) => (
            <tr key={run.id} className="text-gray-700">
              <td className="py-2 pr-4">
                <AIRunStatusBadge status={run.status} />
              </td>
              <td className="py-2 pr-4">{run.pageIds.length}</td>
              <td className="py-2 pr-4">{run.suggestionsCount}</td>
              <td className="py-2 pr-4">${run.estimatedCostUsd.toFixed(4)}</td>
              <td className="py-2 pr-4 text-xs text-gray-500">
                {run.startedAt
                  ? new Date(run.startedAt).toLocaleString()
                  : "—"}
              </td>
              <td className="py-2 text-xs text-gray-400">{run.providerName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
