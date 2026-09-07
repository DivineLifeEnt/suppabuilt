"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";
import { PresenceAvatarStack } from "./PresenceAvatarStack";

const STATUS_LABEL: Record<string, string> = {
  active: "Live",
  ended: "Ended",
  archived: "Archived",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-500 text-white",
  ended: "bg-gray-500 text-white",
  archived: "bg-gray-700 text-gray-300",
};

export function SessionHeader() {
  const { session, connectionStatus } = useCollaborationStore();
  if (!session) return null;

  const label = connectionStatus === "reconnecting" ? "Reconnecting…" : (STATUS_LABEL[session.status] ?? session.status);
  const color = connectionStatus === "reconnecting"
    ? "bg-orange-500 text-white"
    : (STATUS_COLOR[session.status] ?? "bg-gray-600 text-white");

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold text-[#e9edf1]">{session.name}</div>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${color}`}>
        {label}
      </span>
      <PresenceAvatarStack />
    </div>
  );
}
