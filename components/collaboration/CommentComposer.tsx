"use client";

import { useState, useRef } from "react";

interface Props {
  sessionId: string;
  onSubmit: (body: string, mentions: string[]) => Promise<void>;
  placeholder?: string;
}

const MENTION_RE = /@([a-zA-Z0-9._-]+)/g;

function extractMentions(text: string): string[] {
  const matches = [...text.matchAll(MENTION_RE)];
  return [...new Set(matches.map((m) => m[1]))];
}

export function CommentComposer({ onSubmit, placeholder = "Add a comment… (@mention to notify)" }: Props) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed, extractMentions(trimmed));
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-b border-[#222c36] p-2">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 2000))}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded border border-[#2a3540] bg-[#111820] px-2 py-1.5 text-[12px] text-[#d4dce4] placeholder:text-[#4a5568] focus:outline-none focus:border-[#ff6a1a]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
        }}
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-[#4a5568]">{body.length}/2000</span>
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || submitting}
          className="rounded bg-[#ff6a1a] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40 hover:bg-[#ff7b34] transition-colors"
        >
          {submitting ? "…" : "Comment"}
        </button>
      </div>
    </div>
  );
}
