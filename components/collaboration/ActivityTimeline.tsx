"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEvent } from "@/lib/collaboration/types";

interface ActivityTimelineProps {
  sessionId: string;
}

interface PagedResult {
  events: AuditEvent[];
  nextCursor: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function groupByDay(events: AuditEvent[]): Array<{ label: string; events: AuditEvent[] }> {
  const map = new Map<string, AuditEvent[]>();
  for (const ev of events) {
    const label = formatDate(ev.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(ev);
  }
  return Array.from(map.entries()).map(([label, evts]) => ({ label, events: evts }));
}

function actionLabel(action: string): string {
  return action.replace(/_/g, " ").toLowerCase();
}

export function ActivityTimeline({ sessionId }: ActivityTimelineProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextCursor: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(
          `/api/studio-sessions/${encodeURIComponent(sessionId)}/activity`,
          window.location.origin
        );
        if (nextCursor) url.searchParams.set("cursor", nextCursor);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PagedResult;
        setEvents((prev) => (nextCursor ? [...prev, ...data.events] : data.events));
        setCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    void fetchPage(null);
  }, [fetchPage]);

  const groups = groupByDay(events);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-[11px] font-bold tracking-[.14em] text-[#8895a2]">ACTIVITY</h3>

      {error && (
        <p className="rounded border border-[#763d2a] bg-[#281711]/80 px-3 py-2 text-[12px] text-[#f88]">
          {error}
        </p>
      )}

      {groups.length === 0 && !loading && (
        <p className="text-[12px] text-[#556370]">No activity yet.</p>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <div className="mb-2 text-[10px] font-bold tracking-[.12em] text-[#556370]">
            {group.label}
          </div>
          <ul className="flex flex-col gap-1">
            {group.events.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start gap-2 rounded-md bg-[#111820] px-3 py-2"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#ff6a1a]/20 text-[9px] font-bold text-[#ff7a32]">
                  {ev.actorName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[12px] font-semibold text-[#e2e8ee]">
                    {ev.actorName}
                  </span>{" "}
                  <span className="text-[12px] text-[#8895a2]">{actionLabel(ev.action)}</span>{" "}
                  <span className="text-[12px] text-[#556370]">{ev.aggregateType}</span>
                </div>
                <span className="shrink-0 text-[10px] text-[#556370]">
                  {formatTime(ev.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => { if (!loading) void fetchPage(cursor); }}
          disabled={loading}
          className="rounded border border-[#2a3540] px-3 py-1.5 text-[11px] text-[#8895a2] transition hover:border-[#3a4d5c] hover:text-[#bdc6ce] disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
