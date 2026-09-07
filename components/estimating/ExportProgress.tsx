"use client";

import { useEffect, useState } from "react";
import type { ExportJob } from "@/lib/estimating/types";

type Props = {
  jobId: string;
  onComplete: (job: ExportJob) => void;
};

export function ExportProgress({ jobId, onComplete }: Props) {
  const [job, setJob] = useState<ExportJob | null>(null);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      while (!stopped) {
        try {
          const res = await fetch(`/api/exports/${jobId}`);
          if (res.ok) {
            const data = await res.json() as { job: ExportJob };
            setJob(data.job);
            if (data.job.status === "succeeded" || data.job.status === "failed" || data.job.status === "cancelled") {
              onComplete(data.job);
              return;
            }
          }
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    void poll();
    return () => { stopped = true; };
  }, [jobId, onComplete]);

  if (!job) return <div style={{ fontSize: "12px", color: "#6B7280" }}>Loading…</div>;

  return (
    <div style={{ padding: "8px" }}>
      <div style={{ fontSize: "12px", marginBottom: "4px" }}>
        {job.stage ?? job.status} — {job.progress}%
      </div>
      <div style={{ background: "#E5E7EB", borderRadius: "4px", height: "6px" }}>
        <div style={{ width: `${job.progress}%`, background: "#2563EB", height: "6px", borderRadius: "4px", transition: "width 0.3s" }} />
      </div>
      {job.errorMessage && <div style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{job.errorMessage}</div>}
    </div>
  );
}
