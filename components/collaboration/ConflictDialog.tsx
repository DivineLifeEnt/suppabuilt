"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";
import { diffMetadata } from "@/lib/collaboration/reconciliation";

export function ConflictDialog() {
  const { conflicts, resolveConflict } = useCollaborationStore();

  if (conflicts.length === 0) return null;

  const conflict = conflicts[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-[#3b4652] bg-[#0e1620] p-5 shadow-2xl">
        <h2 className="mb-1 text-sm font-bold text-white">Conflict Detected</h2>
        <p className="mb-3 text-[11px] text-[#8895a2]">
          {conflict.kind === "geometry"
            ? "A geometry conflict requires your explicit choice — no automatic merge is possible."
            : conflict.kind === "deleted-remote"
            ? "This item was deleted by another user while you were editing it."
            : conflict.kind === "session-ended"
            ? "The session ended while you were editing."
            : "Another user has modified this item."}
        </p>

        {conflict.kind === "metadata" && (
          <div className="mb-3 rounded border border-[#2a3540] bg-[#0c1117] p-2 text-[10px]">
            {diffMetadata(
              conflict.localState as Record<string, unknown>,
              conflict.serverState as Record<string, unknown>
            ).map((d) => (
              <div key={d.field} className="mb-1">
                <span className="font-semibold text-[#8895a2]">{d.field}: </span>
                <span className="text-red-400 line-through mr-1">{JSON.stringify(d.local)}</span>
                <span className="text-green-400">{JSON.stringify(d.server)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {(conflict.kind === "metadata" || conflict.kind === "geometry") && (
            <button
              onClick={() => resolveConflict(conflict.aggregateId)}
              className="flex-1 rounded border border-[#3b4652] bg-[#1a2530] px-3 py-1.5 text-[11px] text-[#c8d0d8] hover:bg-[#232d3a]"
            >
              Keep Mine
            </button>
          )}
          <button
            onClick={() => resolveConflict(conflict.aggregateId)}
            className="flex-1 rounded bg-[#ff6a1a] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#ff7b34]"
          >
            {conflict.kind === "deleted-remote" || conflict.kind === "session-ended"
              ? "Discard Local"
              : "Accept Theirs"}
          </button>
        </div>
      </div>
    </div>
  );
}
