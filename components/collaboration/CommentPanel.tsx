"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";
import { CommentThread } from "./CommentThread";
import { CommentComposer } from "./CommentComposer";

interface Props {
  sessionId: string;
  currentUserId?: string;
}

export function CommentPanel({ sessionId, currentUserId }: Props) {
  const { comments, showCommentPanel, setShowCommentPanel, addComment, updateComment } = useCollaborationStore();

  if (!showCommentPanel) return null;

  const handleSubmit = async (body: string, mentions: string[]) => {
    const res = await fetch(`/api/studio-sessions/${sessionId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, mentions }),
    });
    if (res.ok) {
      const data = await res.json() as { comment: Parameters<typeof addComment>[0] };
      addComment(data.comment);
    }
  };

  const handleResolve = async (id: string) => {
    const res = await fetch(`/api/comments/${id}/resolve`, { method: "POST" });
    if (res.ok) {
      const data = await res.json() as { comment: Parameters<typeof updateComment>[0] };
      updateComment(data.comment);
    }
  };

  const handleReopen = async (id: string) => {
    const res = await fetch(`/api/comments/${id}/reopen`, { method: "POST" });
    if (res.ok) {
      const data = await res.json() as { comment: Parameters<typeof updateComment>[0] };
      updateComment(data.comment);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json() as { comment?: Parameters<typeof updateComment>[0] };
      if (data.comment) updateComment(data.comment);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-72 flex-col border-l border-[#26313c] bg-[#0d131a] shadow-2xl">
      <div className="flex h-10 items-center justify-between border-b border-[#222c36] px-3">
        <span className="text-[10px] font-bold tracking-[.14em] text-[#8e9aa6]">COMMENTS ({comments.length})</span>
        <button onClick={() => setShowCommentPanel(false)} className="text-[#8895a2] hover:text-white text-sm">✕</button>
      </div>
      <CommentComposer sessionId={sessionId} onSubmit={handleSubmit} />
      <div className="flex-1 overflow-y-auto">
        {comments.length === 0 && (
          <div className="mt-8 text-center text-[11px] text-[#64717e]">No comments yet</div>
        )}
        {comments.map((c) => (
          <CommentThread
            key={c.id}
            comment={c}
            onResolve={handleResolve}
            onReopen={handleReopen}
            onDelete={handleDelete}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
