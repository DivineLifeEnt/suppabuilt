"use client";

import { create } from "zustand";
import { produce } from "immer";
import type { AIAnalysisRun, AISuggestion } from "@/lib/ai/types";

// ─── State ────────────────────────────────────────────────────────────────────
export interface AIStore {
  runs: Map<string, AIAnalysisRun>;
  suggestions: Map<string, AISuggestion>; // keyed by id
  runSuggestions: Map<string, string[]>; // runId → suggestion ids
  sessionSuggestions: Map<string, string[]>; // sessionId → suggestion ids
  pendingCount: number;
  isLoading: boolean;
  error: string | null;

  // actions
  fetchRunStatus: (runId: string) => Promise<void>;
  fetchSessionSuggestions: (sessionId: string) => Promise<void>;
  startRun: (sessionId: string, pageIds: string[]) => Promise<string>;
  cancelRun: (runId: string) => Promise<void>;
  acceptSuggestion: (
    suggestionId: string,
    takeoffInput: { qty: number; unit: string; description: string }
  ) => Promise<void>;
  rejectSuggestion: (suggestionId: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function countPending(suggestions: Map<string, AISuggestion>): number {
  let count = 0;
  for (const s of suggestions.values()) {
    if (s.status === "pending") count++;
  }
  return count;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAIStore = create<AIStore>((set, get) => ({
  runs: new Map(),
  suggestions: new Map(),
  runSuggestions: new Map(),
  sessionSuggestions: new Map(),
  pendingCount: 0,
  isLoading: false,
  error: null,

  fetchRunStatus: async (runId: string) => {
    set(produce((state: AIStore) => { state.isLoading = true; state.error = null; }));
    try {
      const res = await fetch(`/api/ai/runs/${runId}`);
      const data = await res.json() as { run?: AIAnalysisRun; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to fetch run status");
      set(produce((state: AIStore) => {
        state.isLoading = false;
        if (data.run) state.runs.set(runId, data.run);
      }));
    } catch (err) {
      set(produce((state: AIStore) => {
        state.isLoading = false;
        state.error = err instanceof Error ? err.message : "Unknown error";
      }));
    }
  },

  fetchSessionSuggestions: async (sessionId: string) => {
    set(produce((state: AIStore) => { state.isLoading = true; state.error = null; }));
    try {
      const res = await fetch(`/api/ai/sessions/${sessionId}/suggestions`);
      const data = await res.json() as { suggestions?: AISuggestion[]; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to fetch suggestions");
      set(produce((state: AIStore) => {
        state.isLoading = false;
        const ids: string[] = [];
        for (const s of (data.suggestions ?? [])) {
          state.suggestions.set(s.id, s);
          ids.push(s.id);
        }
        state.sessionSuggestions.set(sessionId, ids);
        state.pendingCount = countPending(state.suggestions);
      }));
    } catch (err) {
      set(produce((state: AIStore) => {
        state.isLoading = false;
        state.error = err instanceof Error ? err.message : "Unknown error";
      }));
    }
  },

  startRun: async (sessionId: string, pageIds: string[]): Promise<string> => {
    set(produce((state: AIStore) => { state.isLoading = true; state.error = null; }));
    try {
      const res = await fetch("/api/ai/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, pageIds }),
      });
      const data = await res.json() as { run?: AIAnalysisRun; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to start run");
      const run = data.run!;
      set(produce((state: AIStore) => {
        state.isLoading = false;
        state.runs.set(run.id, run);
      }));
      return run.id;
    } catch (err) {
      set(produce((state: AIStore) => {
        state.isLoading = false;
        state.error = err instanceof Error ? err.message : "Unknown error";
      }));
      throw err;
    }
  },

  cancelRun: async (runId: string) => {
    try {
      const res = await fetch(`/api/ai/runs/${runId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json() as { error?: { message: string } };
        throw new Error(data.error?.message ?? "Failed to cancel run");
      }
      set(produce((state: AIStore) => {
        const run = state.runs.get(runId);
        if (run) run.status = "cancelled";
      }));
    } catch (err) {
      set(produce((state: AIStore) => {
        state.error = err instanceof Error ? err.message : "Unknown error";
      }));
    }
  },

  acceptSuggestion: async (
    suggestionId: string,
    takeoffInput: { qty: number; unit: string; description: string }
  ) => {
    try {
      const res = await fetch(`/api/ai/suggestions/${suggestionId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takeoffInput }),
      });
      const data = await res.json() as { suggestion?: AISuggestion; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to accept suggestion");
      set(produce((state: AIStore) => {
        if (data.suggestion) state.suggestions.set(suggestionId, data.suggestion);
        state.pendingCount = countPending(state.suggestions);
      }));
    } catch (err) {
      set(produce((state: AIStore) => {
        state.error = err instanceof Error ? err.message : "Unknown error";
      }));
      throw err;
    }
  },

  rejectSuggestion: async (suggestionId: string) => {
    try {
      const res = await fetch(`/api/ai/suggestions/${suggestionId}/reject`, { method: "POST" });
      const data = await res.json() as { suggestion?: AISuggestion; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to reject suggestion");
      set(produce((state: AIStore) => {
        if (data.suggestion) state.suggestions.set(suggestionId, data.suggestion);
        state.pendingCount = countPending(state.suggestions);
      }));
    } catch (err) {
      set(produce((state: AIStore) => {
        state.error = err instanceof Error ? err.message : "Unknown error";
      }));
      throw err;
    }
  },
}));
