"use client";

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
  items: PreviewItem[];
  decisions: Map<string, ItemAction>;
  onToggle: (sourceId: string, action: ItemAction) => void;
};

const ICON: Record<string, string> = {
  markup: "✏️",
  measurement: "📏",
  takeoff: "📋",
};

export function CarryForwardPreview({ items, decisions, onToggle }: Props) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-sm text-center text-gray-400">
        No items to carry forward. Select a comparison with existing markups, measurements, or takeoffs on the base version.
      </div>
    );
  }

  const toCarry = items.filter((item) => (decisions.get(item.sourceId) ?? item.action) === "carry");
  const toSkip = items.filter((item) => (decisions.get(item.sourceId) ?? item.action) === "skip");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 text-sm px-4 py-3 bg-blue-50 rounded-lg">
        <div>
          <span className="font-semibold text-blue-700">{toCarry.length}</span>
          <span className="text-blue-600"> items will be carried forward</span>
        </div>
        <div>
          <span className="font-semibold text-gray-600">{toSkip.length}</span>
          <span className="text-gray-500"> items will be skipped</span>
        </div>
      </div>

      {/* Item list */}
      <div className="divide-y border rounded-lg overflow-auto max-h-96">
        {items.map((item) => {
          const action = decisions.get(item.sourceId) ?? item.action;
          const isCarry = action === "carry";

          return (
            <div
              key={item.sourceId}
              className={`flex items-center gap-3 px-4 py-3 ${isCarry ? "" : "opacity-50"}`}
            >
              {/* Icon */}
              <span className="text-lg">{ICON[item.sourceType] ?? "?"}</span>

              {/* Info */}
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-medium capitalize text-gray-800">
                  {item.sourceType} <span className="font-mono text-xs text-gray-400">{item.sourceId.slice(0, 8)}…</span>
                </div>
                <div className="text-xs text-gray-500 space-x-2">
                  {item.outOfBounds && (
                    <span className="text-orange-600">Out of bounds</span>
                  )}
                  {item.calibrationCompatible === false && (
                    <span className="text-orange-600">Calibration mismatch</span>
                  )}
                  {item.reason && <span>{item.reason}</span>}
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => onToggle(item.sourceId, isCarry ? "skip" : "carry")}
                className={`text-xs px-2 py-1 rounded border ${
                  isCarry
                    ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                    : "bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {isCarry ? "Carry" : "Skip"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
