"use client";

import type { ExportJob } from "@/lib/estimating/types";

type Props = {
  jobs: ExportJob[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDownload: (id: string) => void;
};

const STATUS_COLOR: Record<string, string> = {
  queued: "#6B7280", running: "#2563EB", retrying: "#D97706",
  succeeded: "#10B981", failed: "#EF4444", cancelled: "#9CA3AF", expired: "#9CA3AF",
};

export function ExportJobList({ jobs, onCancel, onRetry, onDownload }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {jobs.length === 0 && <div style={{ color: "#9CA3AF", fontSize: "13px", padding: "8px" }}>No export jobs yet.</div>}
      {jobs.map((job) => (
        <div key={job.id} style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: "6px", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: "12px" }}>{job.exportType}</span>
              <span style={{ marginLeft: "8px", fontSize: "11px", color: "#6B7280" }}>{new Date(job.createdAt).toLocaleString()}</span>
            </div>
            <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 600, background: STATUS_COLOR[job.status] ?? "#6B7280", color: "#fff" }}>
              {job.status}
            </span>
          </div>
          {(job.status === "running" || job.status === "retrying") && (
            <div style={{ marginTop: "6px", background: "#E5E7EB", borderRadius: "4px", height: "4px" }}>
              <div style={{ width: `${job.progress}%`, background: "#2563EB", height: "4px", borderRadius: "4px", transition: "width 0.3s" }} />
            </div>
          )}
          {job.errorMessage && <div style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{job.errorMessage}</div>}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px", justifyContent: "flex-end" }}>
            {(job.status === "queued" || job.status === "running") && (
              <button onClick={() => onCancel(job.id)} style={{ padding: "3px 8px", fontSize: "11px", border: "1px solid #D1D5DB", borderRadius: "4px", cursor: "pointer", background: "#fff" }}>Cancel</button>
            )}
            {job.status === "failed" && (
              <button onClick={() => onRetry(job.id)} style={{ padding: "3px 8px", fontSize: "11px", border: "1px solid #D1D5DB", borderRadius: "4px", cursor: "pointer", background: "#fff" }}>Retry</button>
            )}
            {job.status === "succeeded" && (
              <button onClick={() => onDownload(job.id)} style={{ padding: "3px 8px", fontSize: "11px", border: "1px solid #10B981", borderRadius: "4px", cursor: "pointer", background: "#ECFDF5", color: "#065F46", fontWeight: 600 }}>
                Download
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
