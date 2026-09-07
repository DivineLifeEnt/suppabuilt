"use client";

import { useState } from "react";
import type { EstimateVersion } from "@/lib/estimating/types";

type ReviewDecision = { id: string; actorId: string; action: string; comment: string | null; decidedAt: string };

type Props = {
  version: EstimateVersion;
  decisions: ReviewDecision[];
  canSubmit: boolean;
  canApprove: boolean;
  canLock: boolean;
  onSubmitReview: (comment?: string) => void;
  onRequestChanges: (comment: string) => void;
  onApprove: (comment?: string) => void;
  onLock: () => void;
};

const ACTION_LABELS: Record<string, string> = {
  "submit-review": "Submitted for review",
  "request-changes": "Changes requested",
  approve: "Approved",
  lock: "Locked",
};

export function EstimateReviewPanel({ version, decisions, canSubmit, canApprove, canLock, onSubmitReview, onRequestChanges, onApprove, onLock }: Props) {
  const [comment, setComment] = useState("");

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <h3 style={{ margin: 0, fontSize: "15px" }}>Review</h3>
      <div style={{ fontSize: "12px", color: "#6B7280" }}>Status: <strong>{version.status}</strong></div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {decisions.map((d) => (
          <div key={d.id} style={{ padding: "8px", background: "#F9FAFB", borderRadius: "4px", fontSize: "12px" }}>
            <div style={{ fontWeight: 600 }}>{ACTION_LABELS[d.action] ?? d.action}</div>
            <div style={{ color: "#6B7280" }}>{new Date(d.decidedAt).toLocaleString()}</div>
            {d.comment && <div style={{ marginTop: "4px", color: "#374151" }}>{d.comment}</div>}
          </div>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment…"
        style={{ padding: "8px", border: "1px solid #D1D5DB", borderRadius: "4px", minHeight: "64px", fontSize: "13px", resize: "vertical" }}
      />

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {canSubmit && version.status === "draft" && (
          <button onClick={() => { onSubmitReview(comment); setComment(""); }} style={{ padding: "6px 12px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
            Submit for Review
          </button>
        )}
        {canApprove && version.status === "in-review" && (
          <>
            <button onClick={() => { if (comment.trim()) { onRequestChanges(comment); setComment(""); } }} style={{ padding: "6px 12px", background: "#EF4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }} disabled={!comment.trim()}>
              Request Changes
            </button>
            <button onClick={() => { onApprove(comment || undefined); setComment(""); }} style={{ padding: "6px 12px", background: "#10B981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
              Approve
            </button>
          </>
        )}
        {canLock && version.status === "approved" && (
          <button onClick={onLock} style={{ padding: "6px 12px", background: "#6D28D9", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
            Lock
          </button>
        )}
      </div>
    </div>
  );
}
