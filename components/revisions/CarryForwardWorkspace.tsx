"use client";

import { useState } from "react";
import { CarryForwardPreview } from "./CarryForwardPreview";

type ItemAction = "carry" | "skip";

type PreviewItem = {
  sourceType: "markup" | "measurement" | "takeoff";
  sourceId: string;
  action: ItemAction;
  reason?: string;
  outOfBounds?: boolean;
  calibrationCompatible?: boolean;
};

type Props = {
  comparisonId: string;
  onComplete?: () => void;
};

export function CarryForwardWorkspace({ comparisonId, onComplete }: Props) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [decisions, setDecisions] = useState<Map<string, ItemAction>>(new Map());
  const [loading, setLoading] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  async function handlePreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/drawing-comparisons/${comparisonId}/carry-forward/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { items?: PreviewItem[]; error?: { message?: string } };
      if (!res.ok || !data.items) {
        setError(data.error?.message ?? "Preview failed");
        return;
      }
      setItems(data.items);
      setPreviewed(true);
    } catch {
      setError("Preview request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(sourceId: string, action: ItemAction) {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(sourceId, action);
      return next;
    });
  }

  async function handleApply() {
    setLoading(true);
    setError(null);
    try {
      const finalDecisions = items.map((item) => ({
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        action: decisions.get(item.sourceId) ?? item.action,
      }));

      const res = await fetch(`/api/drawing-comparisons/${comparisonId}/carry-forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions: finalDecisions, idempotencyKey }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? "Apply failed");
        return;
      }
      setApplied(true);
      onComplete?.();
    } catch {
      setError("Apply request failed");
    } finally {
      setLoading(false);
    }
  }

  if (applied) {
    return (
      <div className="p-6 text-center text-green-700">
        <div className="text-xl mb-2">Done</div>
        <div className="text-sm">Carry-forward decisions applied. Items carried to the new version.</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Carry Forward</h3>
        <div className="flex gap-2">
          {!previewed && (
            <button
              onClick={() => void handlePreview()}
              disabled={loading}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Preview items"}
            </button>
          )}
          {previewed && (
            <>
              <button
                onClick={() => { setPreviewed(false); setItems([]); setDecisions(new Map()); }}
                disabled={loading}
                className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Re-preview
              </button>
              <button
                onClick={() => void handleApply()}
                disabled={loading || items.length === 0}
                className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Applying…" : "Apply decisions"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</div>
      )}

      <p className="text-xs text-gray-500">
        This carries markups, measurements, and takeoff items from the base version forward to the comparison version using the confirmed alignment. Items that fall outside the page boundary or have incompatible calibrations are flagged. Carry-forward never modifies the source items.
      </p>

      {previewed && (
        <CarryForwardPreview
          items={items}
          decisions={decisions}
          onToggle={handleToggle}
        />
      )}

      {!previewed && !loading && (
        <div className="text-sm text-center text-gray-400 py-8 border-2 border-dashed rounded-lg">
          Click &quot;Preview items&quot; to see which markups, measurements, and takeoffs can be carried forward.
        </div>
      )}
    </div>
  );
}
