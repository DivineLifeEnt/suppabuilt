"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";

export function ParticipantList() {
  const { participants, presence, showParticipantList, setShowParticipantList } = useCollaborationStore();

  if (!showParticipantList) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-72 flex-col border-l border-[#26313c] bg-[#0d131a] shadow-2xl">
      <div className="flex h-10 items-center justify-between border-b border-[#222c36] px-3">
        <span className="text-[10px] font-bold tracking-[.14em] text-[#8e9aa6]">PARTICIPANTS</span>
        <button onClick={() => setShowParticipantList(false)} className="text-[#8895a2] hover:text-white text-sm">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {participants.length === 0 && (
          <div className="text-center text-[11px] text-[#64717e] mt-6">No participants yet</div>
        )}
        {participants.map((p) => {
          const online = presence.has(p.userId);
          return (
            <div key={p.id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-white/4">
              <span className={`size-1.5 rounded-full shrink-0 ${online ? "bg-green-400" : "bg-gray-600"}`} />
              <span className="flex-1 truncate text-[12px] text-[#c8d0d8]">{p.userId}</span>
              <span className="text-[10px] text-[#556370] capitalize">{p.role.replace("project-", "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
