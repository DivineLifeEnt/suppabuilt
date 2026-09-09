"use client";

import { useState } from "react";
import { useAIStore } from "@/stores/aiStore";

interface Props {
  sessionId: string;
  pageIds: string[];
  aiEnabled?: boolean;
  budgetExceeded?: boolean;
  onRunStarted?: (runId: string) => void;
}

export function AIRunButton({
  sessionId,
  pageIds,
  aiEnabled = true,
  budgetExceeded = false,
  onRunStarted,
}: Props) {
  const [isStarting, setIsStarting] = useState(false);
  const startRun = useAIStore((s) => s.startRun);
  const error = useAIStore((s) => s.error);

  const disabled = !aiEnabled || budgetExceeded || isStarting || pageIds.length === 0;

  const handleClick = async () => {
    if (disabled) return;
    setIsStarting(true);
    try {
      const runId = await startRun(sessionId, pageIds);
      onRunStarted?.(runId);
    } catch {
      // error is in store
    } finally {
      setIsStarting(false);
    }
  };

  let title = "Analyze with AI";
  if (!aiEnabled) title = "AI analysis is not enabled";
  else if (budgetExceeded) title = "Monthly AI budget exceeded";
  else if (pageIds.length === 0) title = "No pages selected";

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors
        ${disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
    >
      {isStarting ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Starting…
        </>
      ) : (
        <>
          <span>🤖</span>
          Analyze with AI
        </>
      )}
    </button>
  );
}
