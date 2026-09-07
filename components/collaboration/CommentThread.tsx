"use client";

import type { Comment } from "@/lib/collaboration/types";

interface Props {
  comment: Comment;
  onResolve?: (id: string) => void;
  onReopen?: (id: string) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function CommentThread({ comment, onResolve, onReopen, onDelete, currentUserId }: Props) {
  const isDeleted = !!comment.deletedAt;
  const isResolved = comment.status === "resolved";

  return (
    <div className={`border-b border-[#1a2530] px-2 py-2 ${isResolved ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 size-6 shrink-0 rounded-full grid place-items-center text-white text-[9px] font-bold bg-[#3182CE]"
          title={comment.authorName}
        >
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-[#c8d0d8]">{comment.authorName}</span>
            <span className="text-[10px] text-[#4a5568]">{timeAgo(comment.createdAt)}</span>
            {isResolved && <span className="rounded bg-green-900/50 px-1 text-[9px] text-green-400">resolved</span>}
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[#9ca8b4] whitespace-pre-wrap break-words">
            {isDeleted ? <em>[deleted]</em> : comment.body}
          </p>
          {!isDeleted && (
            <div className="mt-1 flex gap-2">
              {!isResolved && onResolve && (
                <button onClick={() => onResolve(comment.id)} className="text-[9px] text-[#4a5568] hover:text-green-400">
                  Resolve
                </button>
              )}
              {isResolved && onReopen && (
                <button onClick={() => onReopen(comment.id)} className="text-[9px] text-[#4a5568] hover:text-yellow-400">
                  Reopen
                </button>
              )}
              {comment.authorId === currentUserId && onDelete && !isDeleted && (
                <button onClick={() => onDelete(comment.id)} className="text-[9px] text-[#4a5568] hover:text-red-400">
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
