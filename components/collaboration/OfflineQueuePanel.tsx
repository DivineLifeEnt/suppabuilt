"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";

export function OfflineQueuePanel() {
  const { showOfflinePanel, offlineQueueSize, setShowOfflinePanel } = useCollaborationStore();

  if (!showOfflinePanel) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-72 flex-col border-l border-[#26313c] bg-[#0d131a] shadow-2xl">
      <div className="flex h-10 items-center justify-between border-b border-[#222c36] px-3">
        <span className="text-[10px] font-bold tracking-[.14em] text-[#8e9aa6]">OFFLINE QUEUE</span>
        <button onClick={() => setShowOfflinePanel(false)} className="text-[#8895a2] hover:text-white text-sm">✕</button>
      </div>
      <div className="flex-1 p-3">
        {offlineQueueSize === 0 ? (
          <div className="mt-8 text-center text-[11px] text-[#64717e]">No queued operations</div>
        ) : (
          <>
            <div className="mb-3 rounded bg-orange-500/10 border border-orange-500/20 px-3 py-2 text-[11px] text-orange-300">
              {offlineQueueSize} operation{offlineQueueSize !== 1 ? "s" : ""} pending replay
            </div>
            <div className="flex gap-2">
              <button className="flex-1 rounded border border-[#3b4652] bg-[#1a2530] px-2 py-1.5 text-[10px] text-[#c8d0d8] hover:bg-[#232d3a]">
                Retry All
              </button>
              <button className="rounded border border-red-900/50 bg-red-950/30 px-2 py-1.5 text-[10px] text-red-400 hover:bg-red-900/30">
                Discard All
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
