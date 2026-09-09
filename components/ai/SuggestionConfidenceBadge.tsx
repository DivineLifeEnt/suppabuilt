"use client";

import { confidenceLabel } from "@/lib/ai/confidence";

const CONFIDENCE_STYLES = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
};

interface Props {
  confidence: number;
}

export function SuggestionConfidenceBadge({ confidence }: Props) {
  const label = confidenceLabel(confidence);
  const pct = Math.round(confidence * 100);

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[label]}`}>
      {label} ({pct}%)
    </span>
  );
}
