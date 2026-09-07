"use client";

import { useState } from "react";
import { useRevisionsStore } from "@/stores/revisionsStore";
import { AlignmentPointTool } from "./AlignmentPointTool";
import type { PageAlignment } from "@/lib/revisions/types";

type Props = {
  pageMatchId: string;
  onConfirmed?: (alignment: PageAlignment) => void;
};

export function AlignmentWorkspace({ pageMatchId, onConfirmed }: Props) {
  const { alignmentDraft, addAlignmentPoint, removeAlignmentPoint, clearAlignmentDraft } =
    useRevisionsStore();
  const [loading, setLoading] = useState(false);
  const [alignment, setAlignment] = useState<PageAlignment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { basePoints, compPoints } = alignmentDraft;
  const canCompute = basePoints.length >= 2 && compPoints.length === basePoints.length;

  async function handleComputeManual() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/page-matches/${pageMatchId}/alignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePoints, comparisonPoints: compPoints }),
      });
      const data = (await res.json()) as { alignment?: PageAlignment; error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? "Failed to compute alignment");
        return;
      }
      if (data.alignment) setAlignment(data.alignment);
    } catch {
      setError("Failed to compute alignment");
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoAlign() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/page-matches/${pageMatchId}/alignment/auto`, { method: "POST" });
      const data = (await res.json()) as { alignment?: PageAlignment };
      if (data.alignment) setAlignment(data.alignment);
    } catch {
      setError("Auto-alignment failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!alignment) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/page-matches/${pageMatchId}/alignment/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alignmentId: alignment.id }),
      });
      const data = (await res.json()) as { alignment?: PageAlignment };
      if (data.alignment) {
        setAlignment(data.alignment);
        onConfirmed?.(data.alignment);
      }
    } catch {
      setError("Confirm failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Alignment</h3>
        <div className="flex gap-2">
          <button
            onClick={handleAutoAlign}
            disabled={loading}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Auto-align
          </button>
          <button
            onClick={handleComputeManual}
            disabled={!canCompute || loading}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Compute ({basePoints.length} pts)
          </button>
          <button
            onClick={clearAlignmentDraft}
            disabled={loading}
            className="text-sm px-3 py-1 border rounded text-gray-500 hover:bg-gray-50"
          >
            Reset
          </button>
          {alignment && !alignment.userConfirmed && (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="text-sm px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
            >
              Confirm
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {alignment && (
        <div className="text-sm space-y-1 bg-gray-50 rounded p-3">
          <div className="flex gap-4">
            <span>Method: <strong>{alignment.method}</strong></span>
            {alignment.qualityScore !== null && (
              <span>Quality: <strong>{(alignment.qualityScore * 100).toFixed(0)}%</strong></span>
            )}
            {alignment.residualError !== null && (
              <span>Residual: <strong>{alignment.residualError.toFixed(4)}</strong></span>
            )}
            {alignment.userConfirmed && (
              <span className="text-green-600">✓ Confirmed</span>
            )}
          </div>
          {alignment.qualityScore !== null && alignment.qualityScore < 0.7 && (
            <div className="text-yellow-600 text-xs">
              Low quality alignment — consider adding more control points.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs font-medium text-blue-700">Base Page — click to add points (circles)</div>
          <div className="relative bg-gray-100 rounded" style={{ height: 300 }}>
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
              Page render here
            </div>
            <AlignmentPointTool
              side="base"
              points={basePoints}
              onAddPoint={(pt) => addAlignmentPoint("base", pt)}
              onRemovePoint={(i) => removeAlignmentPoint("base", i)}
              width={400}
              height={300}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium text-red-700">Comparison Page — click to add points (crosses)</div>
          <div className="relative bg-gray-100 rounded" style={{ height: 300 }}>
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
              Page render here
            </div>
            <AlignmentPointTool
              side="comp"
              points={compPoints}
              onAddPoint={(pt) => addAlignmentPoint("comp", pt)}
              onRemovePoint={(i) => removeAlignmentPoint("comp", i)}
              width={400}
              height={300}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Place 2 points for similarity (rotation+scale), 3 points for full affine transform.
        Base points shown as circles (blue), comparison as crosses (red).
      </p>
    </div>
  );
}
