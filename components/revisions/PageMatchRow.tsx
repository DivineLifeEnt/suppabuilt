"use client";

import type { PageMatch, DrawingPageVersion } from "@/lib/revisions/types";

const STATUS_COLORS: Record<string, string> = {
  matched: "bg-green-100 text-green-800",
  ambiguous: "bg-yellow-100 text-yellow-800",
  added: "bg-blue-100 text-blue-800",
  removed: "bg-orange-100 text-orange-800",
  unmatched: "bg-gray-100 text-gray-600",
  "manually-matched": "bg-purple-100 text-purple-800",
};

type Props = {
  match: PageMatch;
  basePage?: DrawingPageVersion | null;
  compPage?: DrawingPageVersion | null;
  onUpdate?: (matchId: string, update: { userConfirmed?: boolean; status?: PageMatch["status"] }) => void;
};

export function PageMatchRow({ match, basePage, compPage, onUpdate }: Props) {
  return (
    <tr className="border-b hover:bg-gray-50">
      {/* Base page */}
      <td className="py-3 px-4">
        {basePage ? (
          <div className="space-y-0.5">
            <div className="font-medium text-sm">{basePage.sheetNumber ?? `Page ${basePage.pageIndex + 1}`}</div>
            {basePage.sheetTitle && <div className="text-xs text-gray-500 truncate max-w-40">{basePage.sheetTitle}</div>}
          </div>
        ) : (
          <span className="text-gray-300 text-sm italic">—</span>
        )}
      </td>

      {/* Status + confidence */}
      <td className="py-3 px-4 text-center">
        <div className="space-y-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[match.status] ?? ""}`}>
            {match.status}
          </span>
          <div className="text-xs text-gray-400">{Math.round(match.confidence * 100)}%</div>
          {match.matchReasons.length > 0 && (
            <div className="text-xs text-gray-400">{match.matchReasons.join(", ")}</div>
          )}
        </div>
      </td>

      {/* Comparison page */}
      <td className="py-3 px-4">
        {compPage ? (
          <div className="space-y-0.5">
            <div className="font-medium text-sm">{compPage.sheetNumber ?? `Page ${compPage.pageIndex + 1}`}</div>
            {compPage.sheetTitle && <div className="text-xs text-gray-500 truncate max-w-40">{compPage.sheetTitle}</div>}
          </div>
        ) : (
          <span className="text-gray-300 text-sm italic">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex gap-2">
          {!match.userConfirmed && match.status !== "ambiguous" && (
            <button
              onClick={() => onUpdate?.(match.id, { userConfirmed: true })}
              className="text-xs text-green-600 hover:underline"
            >
              Accept
            </button>
          )}
          {match.status === "matched" && (
            <button
              onClick={() => onUpdate?.(match.id, { status: "unmatched" })}
              className="text-xs text-red-500 hover:underline"
            >
              Reject
            </button>
          )}
          {match.userConfirmed && (
            <span className="text-xs text-green-500">✓ Confirmed</span>
          )}
        </div>
      </td>
    </tr>
  );
}
