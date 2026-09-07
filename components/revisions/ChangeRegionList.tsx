"use client";

import { useEffect, useState } from "react";
import type { ChangeRegion } from "@/lib/revisions/types";

type Props = {
  comparisonId: string;
  onSelectRegion?: (region: ChangeRegion) => void;
};

const REVIEW_LABELS: Record<string, string> = {
  unreviewed: "Unreviewed",
  accepted: "Accepted",
  dismissed: "Dismissed",
};

const REVIEW_COLORS: Record<string, string> = {
  unreviewed: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

const KIND_COLORS: Record<string, string> = {
  added: "text-cyan-700",
  removed: "text-fuchsia-700",
  changed: "text-orange-700",
};

export function ChangeRegionList({ comparisonId, onSelectRegion }: Props) {
  const [regions, setRegions] = useState<ChangeRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!comparisonId) return;
    setLoading(true);
    fetch(`/api/drawing-comparisons/${comparisonId}/regions`)
      .then((r) => r.json())
      .then((data: { regions?: ChangeRegion[]; error?: { message?: string } }) => {
        if (data.regions) setRegions(data.regions);
        else setError(data.error?.message ?? "Failed to load regions");
      })
      .catch(() => setError("Failed to load regions"))
      .finally(() => setLoading(false));
  }, [comparisonId]);

  async function updateStatus(regionId: string, reviewStatus: string) {
    setUpdatingId(regionId);
    try {
      const res = await fetch(`/api/change-regions/${regionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      const data = (await res.json()) as { region?: ChangeRegion };
      if (data.region) {
        setRegions((prev) => prev.map((r) => (r.id === regionId ? data.region! : r)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-400">Loading change regions…</div>;
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;
  if (regions.length === 0) return (
    <div className="p-4 text-sm text-gray-400">
      No change regions detected. Run a comparison to detect changes.
    </div>
  );

  return (
    <div className="divide-y overflow-auto">
      <div className="px-4 py-2 text-xs text-gray-500 font-medium bg-gray-50">
        {regions.length} change region{regions.length !== 1 ? "s" : ""} detected
      </div>
      {regions.map((region, i) => (
        <div
          key={region.id}
          className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer"
          onClick={() => onSelectRegion?.(region)}
        >
          {/* Index */}
          <div className="text-xs font-mono text-gray-400 pt-0.5 w-5 shrink-0">{i + 1}</div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-xs space-y-1">
            <div className="font-medium text-gray-700 truncate">
              <span className={KIND_COLORS[region.kind] ?? "text-gray-700"}>
                {region.kind.charAt(0).toUpperCase() + region.kind.slice(1)}
              </span>{" "}
              at ({(region.bounds.x * 100).toFixed(1)}%,{" "}
              {(region.bounds.y * 100).toFixed(1)}%) —{" "}
              {(region.bounds.width * 100).toFixed(1)}×{(region.bounds.height * 100).toFixed(1)}%
            </div>
            <div className="text-gray-500">
              {region.changedPixelCount.toLocaleString()} changed px ·{" "}
              Strength: {(region.strength * 100).toFixed(0)}%
            </div>
          </div>

          {/* Review status */}
          <div className="shrink-0 flex flex-col gap-1 items-end">
            <span className={`text-xs px-1.5 py-0.5 rounded ${REVIEW_COLORS[region.reviewStatus] ?? "bg-gray-100"}`}>
              {REVIEW_LABELS[region.reviewStatus] ?? region.reviewStatus}
            </span>
            <div className="flex gap-1">
              {region.reviewStatus !== "accepted" && (
                <button
                  disabled={updatingId === region.id}
                  onClick={(e) => { e.stopPropagation(); void updateStatus(region.id, "accepted"); }}
                  className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50"
                >
                  Accept
                </button>
              )}
              {region.reviewStatus !== "dismissed" && (
                <button
                  disabled={updatingId === region.id}
                  onClick={(e) => { e.stopPropagation(); void updateStatus(region.id, "dismissed"); }}
                  className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
