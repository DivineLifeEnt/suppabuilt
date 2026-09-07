"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";

const STATUS_CONFIG = {
  connecting:    { color: "bg-yellow-400", label: "Connecting…" },
  live:          { color: "bg-green-400",  label: "Live" },
  reconnecting:  { color: "bg-orange-400", label: "Reconnecting…" },
  offline:       { color: "bg-red-500",    label: "Offline" },
  ended:         { color: "bg-gray-500",   label: "Session ended" },
} as const;

export function ConnectionStatus() {
  const { connectionStatus, offlineQueueSize, setShowOfflinePanel } = useCollaborationStore();
  const cfg = STATUS_CONFIG[connectionStatus];

  return (
    <button
      onClick={() => setShowOfflinePanel(true)}
      className="flex items-center gap-1.5 rounded px-2 py-0.5 hover:bg-white/5 transition-colors"
      title={offlineQueueSize > 0 ? `${offlineQueueSize} queued operations` : cfg.label}
    >
      <span className={`size-1.5 rounded-full ${cfg.color} ${connectionStatus === "connecting" || connectionStatus === "reconnecting" ? "animate-pulse" : ""}`} />
      <span className="text-[10px] text-[#8895a2]">{cfg.label}</span>
      {offlineQueueSize > 0 && (
        <span className="rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">{offlineQueueSize}</span>
      )}
    </button>
  );
}
