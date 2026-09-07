"use client";

import { useEffect, useState } from "react";
import type { ProcessingJob } from "@/lib/revisions/types";

type Props = {
  jobId: string;
  pollIntervalMs?: number;
  onComplete?: (job: ProcessingJob) => void;
  onFailed?: (job: ProcessingJob) => void;
};

const STATE_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  retrying: "Retrying",
};

const STATE_COLORS: Record<string, string> = {
  queued: "text-yellow-600",
  running: "text-blue-600",
  succeeded: "text-green-600",
  failed: "text-red-600",
  cancelled: "text-gray-500",
  retrying: "text-orange-600",
};

const TERMINAL_STATES = new Set(["succeeded", "failed", "cancelled"]);

export function JobProgress({ jobId, pollIntervalMs = 2000, onComplete, onFailed }: Props) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/processing-jobs/${jobId}`);
        const data = (await res.json()) as { job?: ProcessingJob; error?: { message?: string } };
        if (cancelled) return;

        if (!res.ok || !data.job) {
          setError(data.error?.message ?? "Failed to load job");
          return;
        }

        setJob(data.job);

        if (data.job.state === "succeeded") {
          onComplete?.(data.job);
          return;
        }
        if (data.job.state === "failed" || data.job.state === "cancelled") {
          onFailed?.(data.job);
          return;
        }

        if (!cancelled) {
          setTimeout(poll, pollIntervalMs);
        }
      } catch {
        if (!cancelled) setError("Polling failed");
      }
    }

    void poll();
    return () => { cancelled = true; };
  }, [jobId, pollIntervalMs, onComplete, onFailed]);

  if (error) {
    return (
      <div className="text-sm text-red-600 flex items-center gap-2">
        <span>Job error: {error}</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-sm text-gray-400 flex items-center gap-2">
        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading job…
      </div>
    );
  }

  const isTerminal = TERMINAL_STATES.has(job.state);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        {!isTerminal && (
          <svg className="animate-spin h-3.5 w-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}

        <span className={`font-medium ${STATE_COLORS[job.state] ?? "text-gray-600"}`}>
          {STATE_LABELS[job.state] ?? job.state}
        </span>

        <span className="text-gray-400 text-xs capitalize">
          {job.type.replace(/-/g, " ")}
        </span>

        {job.attemptCount > 1 && (
          <span className="text-xs text-gray-400">
            attempt {job.attemptCount}/{job.maxAttempts}
          </span>
        )}

        {job.progress > 0 && (
          <span className="text-xs text-gray-500">{job.progress}%</span>
        )}
      </div>

      {/* Progress bar for active states */}
      {!isTerminal && (
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: job.progress > 0 ? `${job.progress}%` : "60%" }}
          />
        </div>
      )}

      {/* Error message */}
      {job.state === "failed" && job.errorMessage && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2">
          {job.errorCode && <span className="font-mono mr-1">[{job.errorCode}]</span>}
          {job.errorMessage}
        </div>
      )}

      {/* Stage */}
      {job.stage && !isTerminal && (
        <div className="text-xs text-gray-500 italic">{job.stage}</div>
      )}
    </div>
  );
}
