"use client";

import type { AIAnalysisRun } from "@/lib/ai/types";

const STATUS_STYLES: Record<AIAnalysisRun["status"], string> = {
  queued: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-yellow-100 text-yellow-700",
};

const STATUS_LABELS: Record<AIAnalysisRun["status"], string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

interface Props {
  status: AIAnalysisRun["status"];
}

export function AIRunStatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
