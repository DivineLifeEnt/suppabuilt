"use client";

import { useState } from "react";

type Props = {
  jobId: string;
  filename?: string;
};

export function ExportDownload({ jobId, filename }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exports/${jobId}/download`);
      if (!res.ok) { setError("Download not available"); return; }
      const data = await res.json() as { url: string };
      // Redirect to signed URL
      window.location.href = data.url;
    } catch {
      setError("Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        style={{ padding: "7px 16px", background: loading ? "#9CA3AF" : "#10B981", color: "#fff", border: "none", borderRadius: "6px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "13px" }}
      >
        {loading ? "Getting link…" : `Download${filename ? ` ${filename}` : ""}`}
      </button>
      {error && <div style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{error}</div>}
    </div>
  );
}
