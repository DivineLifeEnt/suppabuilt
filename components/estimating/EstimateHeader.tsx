"use client";

import type { Estimate, EstimateVersion } from "@/lib/estimating/types";

type Props = {
  estimate: Estimate;
  versions: EstimateVersion[];
  activeVersion: EstimateVersion | null;
  onSelectVersion: (versionId: string) => void;
  onSubmitReview: () => void;
  onApprove: () => void;
  onLock: () => void;
  onCreateVersion: () => void;
  canSubmit: boolean;
  canApprove: boolean;
  canLock: boolean;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#6B7280", "in-review": "#D97706", "changes-requested": "#EF4444",
  approved: "#10B981", locked: "#6D28D9", superseded: "#9CA3AF", archived: "#9CA3AF",
};

export function EstimateHeader({
  estimate, versions, activeVersion, onSelectVersion,
  onSubmitReview, onApprove, onLock, onCreateVersion,
  canSubmit, canApprove, canLock,
}: Props) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <span style={{ fontWeight: 700, fontSize: "16px" }}>{estimate.name}</span>
        <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6B7280" }}>{estimate.estimateNumber}</span>
      </div>
      {activeVersion && (
        <span style={{
          padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600,
          background: STATUS_COLOR[activeVersion.status] ?? "#6B7280", color: "#fff",
        }}>
          {activeVersion.status}
        </span>
      )}
      <select
        value={activeVersion?.id ?? ""}
        onChange={(e) => onSelectVersion(e.target.value)}
        style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #D1D5DB" }}
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>v{v.versionNumber} — {v.status}</option>
        ))}
      </select>
      <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
        {canSubmit && activeVersion?.status === "draft" && (
          <button onClick={onSubmitReview} style={{ padding: "6px 12px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
            Submit for Review
          </button>
        )}
        {canApprove && activeVersion?.status === "in-review" && (
          <button onClick={onApprove} style={{ padding: "6px 12px", background: "#10B981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
            Approve
          </button>
        )}
        {canLock && activeVersion?.status === "approved" && (
          <button onClick={onLock} style={{ padding: "6px 12px", background: "#6D28D9", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
            Lock
          </button>
        )}
        <button onClick={onCreateVersion} style={{ padding: "6px 12px", background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
          + New Version
        </button>
      </div>
    </div>
  );
}
