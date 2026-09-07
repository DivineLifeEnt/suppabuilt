"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";

export function PresenceAvatarStack() {
  const { presence, setShowParticipantList } = useCollaborationStore();
  const users = [...presence.values()];
  const visible = users.slice(0, 5);
  const overflow = users.length - 5;

  return (
    <button
      onClick={() => setShowParticipantList(true)}
      className="flex items-center"
      title="View participants"
    >
      <div className="flex -space-x-2">
        {visible.map((u) => (
          <div
            key={u.userId}
            className="size-7 rounded-full border-2 border-[#0c1117] grid place-items-center text-white text-[10px] font-bold shadow"
            style={{ backgroundColor: u.color }}
            title={u.name}
          >
            {u.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div className="size-7 rounded-full border-2 border-[#0c1117] grid place-items-center bg-[#26313c] text-[#8895a2] text-[9px] font-bold shadow">
            +{overflow}
          </div>
        )}
      </div>
    </button>
  );
}
