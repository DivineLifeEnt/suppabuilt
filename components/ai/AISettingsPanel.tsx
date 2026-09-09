"use client";

import { useState } from "react";

interface Policy {
  aiEnabled: boolean;
  monthlyLimitUsd: unknown;
}

interface Props {
  policy: Policy | null;
  onSave?: (updated: { monthlyLimitUsd: number }) => Promise<void>;
}

export function AISettingsPanel({ policy, onSave }: Props) {
  const [limit, setLimit] = useState(Number(policy?.monthlyLimitUsd ?? 0));
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave({ monthlyLimitUsd: limit });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setIsSaving(false);
    }
  };

  const aiEnabled = policy?.aiEnabled ?? false;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">AI Analysis Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage AI-assisted plan analysis for your organization.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">AI Analysis</p>
          <p className="text-xs text-gray-500">
            {aiEnabled ? "Enabled — controlled by AI_ENABLED env var" : "Disabled — set AI_ENABLED=true to enable"}
          </p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
          aiEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          {aiEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Budget Limit (USD)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            AI runs will be blocked if they would exceed this limit. Set to 0 to disallow all runs.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">$</span>
            <input
              type="number"
              min={0}
              max={10000}
              step={0.01}
              value={limit}
              onChange={(e) => setLimit(parseFloat(e.target.value) || 0)}
              className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving || !onSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Budget"}
          </button>
          {saved && <span className="text-sm text-green-600">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
