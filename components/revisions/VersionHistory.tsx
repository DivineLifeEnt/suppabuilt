"use client";

import { useState, useEffect } from "react";
import type { DrawingSetVersion } from "@/lib/revisions/types";

const STATUS_COLORS: Record<string, string> = {
  processing: "bg-yellow-100 text-yellow-800",
  ready: "bg-blue-100 text-blue-800",
  current: "bg-green-100 text-green-800",
  superseded: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-800",
  archived: "bg-gray-50 text-gray-400",
};

type Props = {
  drawingSetId: string;
  onSelectVersion?: (version: DrawingSetVersion) => void;
};

export function VersionHistory({ drawingSetId, onSelectVersion }: Props) {
  const [versions, setVersions] = useState<DrawingSetVersion[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/drawing-sets/${drawingSetId}/versions`)
      .then((r) => r.json())
      .then((data: { versions?: DrawingSetVersion[] }) => setVersions(data.versions ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [drawingSetId]);

  async function handleConfirmCurrent(version: DrawingSetVersion) {
    await fetch(`/api/drawing-versions/${version.id}/confirm-current`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedRevision: version.revision }),
    });
    load();
  }

  async function handleRetry(version: DrawingSetVersion) {
    await fetch(`/api/drawing-versions/${version.id}/retry`, { method: "POST" });
    load();
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading versions…</div>;

  if (versions.length === 0) {
    return <div className="p-4 text-sm text-gray-400">No versions uploaded yet.</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold">Version History</h3>
      <div className="space-y-2">
        {versions.map((v) => (
          <div key={v.id} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-sm">{v.revisionName}</span>
                {v.revisionNumber && (
                  <span className="ml-2 text-xs text-gray-500">({v.revisionNumber})</span>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status] ?? ""}`}>
                {v.status}
              </span>
            </div>
            <div className="text-xs text-gray-500">{v.sourceFilename}</div>
            <div className="flex gap-2">
              <button
                onClick={() => onSelectVersion?.(v)}
                className="text-xs text-blue-600 hover:underline"
              >
                View pages
              </button>
              {v.status === "ready" && (
                <button
                  onClick={() => handleConfirmCurrent(v)}
                  className="text-xs text-green-600 hover:underline"
                >
                  Set as current
                </button>
              )}
              {v.status === "failed" && (
                <button
                  onClick={() => handleRetry(v)}
                  className="text-xs text-orange-600 hover:underline"
                >
                  Retry
                </button>
              )}
            </div>
            {v.processingError && (
              <div className="text-xs text-red-600">{v.processingError}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
