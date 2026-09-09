"use client";

import type { AIUsageSummary } from "@/lib/ai/types";

interface Props {
  usage: AIUsageSummary;
}

export function AIBudgetMeter({ usage }: Props) {
  const pct = usage.budgetLimitUsd > 0
    ? Math.min(100, (usage.totalCostUsd / usage.budgetLimitUsd) * 100)
    : 0;

  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-blue-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">AI Budget</span>
        <span className="text-gray-500 text-xs">
          ${usage.totalCostUsd.toFixed(2)} / ${usage.budgetLimitUsd.toFixed(2)}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>${usage.remainingUsd.toFixed(2)} remaining</span>
        <span>{usage.totalRuns} run{usage.totalRuns !== 1 ? "s" : ""} this month</span>
      </div>
    </div>
  );
}
