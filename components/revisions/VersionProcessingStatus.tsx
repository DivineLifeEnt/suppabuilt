"use client";

import { useState, useEffect, useRef } from "react";
import type { ProcessingJob } from "@/lib/revisions/types";

type Props = {
  jobId: string;
  versionId?: string;
  onComplete?: () => void;
};

export function VersionProcessingStatus({ jobId, versionId, onComplete }: Props) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function poll() {
    fetch(`/api/processing-jobs/${jobId}`)
      .then((r) => r.json())
      .then((data: { job?: ProcessingJob }) => {
        if (data.job) {
          setJob(data.job);
          if (data.job.state === "succeeded" || data.job.state === "failed") {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (data.job.state === "succeeded") onComplete?.();
          }
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  if (!job) return <div className="text-sm text-gray-500 p-4">Loading job status…</div>;

  const isRunning = job.state === "running" || job.state === "queued" || job.state === "retrying";

  return (
    <div className="p-4 space-y-3 border rounded">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Processing</span>
        <span className={`text-xs px-2 py-0.5 rounded ${
          job.state === "succeeded" ? "bg-green-100 text-green-800" :
          job.state === "failed" ? "bg-red-100 text-red-800" :
          "bg-yellow-100 text-yellow-800"
        }`}>{job.state}</span>
      </div>

      {job.stage && (
        <div className="text-xs text-gray-500 capitalize">{job.stage.replace(/-/g, " ")}</div>
      )}

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            job.state === "failed" ? "bg-red-400" :
            job.state === "succeeded" ? "bg-green-400" :
            "bg-blue-400"
          }`}
          style={{ width: `${job.progress}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 text-right">{job.progress}%</div>

      {job.state === "failed" && job.errorMessage && (
        <div className="text-red-600 text-sm space-y-2">
          <div>{job.errorMessage}</div>
          {versionId && (
            <button
              onClick={() => fetch(`/api/drawing-versions/${versionId}/retry`, { method: "POST" })}
              className="text-xs text-orange-600 hover:underline"
            >
              Retry ingest
            </button>
          )}
        </div>
      )}

      {isRunning && (
        <button
          onClick={() => fetch(`/api/processing-jobs/${jobId}/cancel`, { method: "POST" })}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
