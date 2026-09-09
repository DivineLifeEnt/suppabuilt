"use client";

import { useEffect } from "react";
import { useAIStore } from "@/stores/aiStore";
import type { AIAnalysisRun } from "@/lib/ai/types";

interface Props {
  run: AIAnalysisRun;
}

export function AIRunProgress({ run }: Props) {
  const fetchRunStatus = useAIStore((s) => s.fetchRunStatus);

  useEffect(() => {
    if (run.status !== "running" && run.status !== "queued") return;

    const interval = setInterval(() => {
      fetchRunStatus(run.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [run.id, run.status, fetchRunStatus]);

  const isActive = run.status === "running" || run.status === "queued";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {run.status === "queued" ? "Waiting to start…" : "Analyzing drawings…"}
        </span>
        <span className="text-gray-400 text-xs">{run.pageIds.length} page(s)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isActive ? "bg-blue-500 animate-pulse" : run.status === "completed" ? "bg-green-500 w-full" : "bg-red-500 w-full"
          }`}
          style={{ width: isActive ? "60%" : "100%" }}
        />
      </div>
    </div>
  );
}
