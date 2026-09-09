"use client";

import { useState } from "react";
import type { AISuggestion } from "@/lib/ai/types";

interface Props {
  suggestion: AISuggestion;
  onConfirm: (takeoffInput: { qty: number; unit: string; description: string }) => Promise<void>;
  onClose: () => void;
}

export function AcceptSuggestionDialog({ suggestion, onConfirm, onClose }: Props) {
  const [qty, setQty] = useState(suggestion.qty ?? 1);
  const [unit, setUnit] = useState(suggestion.unit ?? "ea");
  const [description, setDescription] = useState(suggestion.description);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) { setError("Quantity must be positive"); return; }
    if (!unit.trim()) { setError("Unit is required"); return; }
    if (!description.trim()) { setError("Description is required"); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm({ qty, unit: unit.trim(), description: description.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept suggestion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Accept Suggestion</h2>
        <p className="mb-4 text-sm text-gray-500">
          Review and confirm the takeoff details before accepting. This action cannot be undone automatically.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min={0.001}
              step="any"
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? "Accepting…" : "Accept to Takeoff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
