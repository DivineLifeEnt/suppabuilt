"use client";

interface Props {
  onStartAnalysis?: () => void;
}

export function AIEmptyState({ onStartAnalysis }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-5xl">🤖</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Analysis Yet</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        AI analysis can detect HVAC symbols, extract equipment schedules, and read text from your
        plan drawings. All suggestions require your manual review before affecting takeoff totals.
      </p>
      {onStartAnalysis && (
        <button
          onClick={onStartAnalysis}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Start Analysis
        </button>
      )}
    </div>
  );
}
