"use client";

import { create } from "zustand";
import type { StudioSession, SessionParticipant, PresenceState, Comment } from "@/lib/collaboration/types";
import type { Conflict } from "@/lib/collaboration/reconciliation";

export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline" | "ended";

interface CollaborationState {
  session: StudioSession | null;
  participants: SessionParticipant[];
  presence: Map<string, PresenceState>;
  comments: Comment[];
  unreadCount: number;
  connectionStatus: ConnectionStatus;
  conflicts: Conflict[];
  offlineQueueSize: number;
  currentUser: { id: string; name: string; color: string } | null;
  showCommentPanel: boolean;
  showParticipantList: boolean;
  showOfflinePanel: boolean;

  // Actions
  setSession: (session: StudioSession | null) => void;
  setParticipants: (participants: SessionParticipant[]) => void;
  updatePresence: (userId: string, state: PresenceState) => void;
  removePresence: (userId: string) => void;
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  updateComment: (comment: Comment) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addConflict: (conflict: Conflict) => void;
  resolveConflict: (aggregateId: string) => void;
  setOfflineQueueSize: (size: number) => void;
  setCurrentUser: (user: { id: string; name: string; color: string } | null) => void;
  setShowCommentPanel: (v: boolean) => void;
  setShowParticipantList: (v: boolean) => void;
  setShowOfflinePanel: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  session: null,
  participants: [],
  presence: new Map<string, PresenceState>(),
  comments: [],
  unreadCount: 0,
  connectionStatus: "connecting" as ConnectionStatus,
  conflicts: [],
  offlineQueueSize: 0,
  currentUser: null,
  showCommentPanel: false,
  showParticipantList: false,
  showOfflinePanel: false,
};

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  ...initialState,

  setSession: (session) => set({ session }),
  setParticipants: (participants) => set({ participants }),

  updatePresence: (userId, state) =>
    set((s) => {
      const next = new Map(s.presence);
      next.set(userId, state);
      return { presence: next };
    }),

  removePresence: (userId) =>
    set((s) => {
      const next = new Map(s.presence);
      next.delete(userId);
      return { presence: next };
    }),

  setComments: (comments) => set({ comments }),

  addComment: (comment) =>
    set((s) => ({ comments: [...s.comments, comment] })),

  updateComment: (comment) =>
    set((s) => ({
      comments: s.comments.map((c) => (c.id === comment.id ? comment : c)),
    })),

  setUnreadCount: (unreadCount) => set({ unreadCount }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  addConflict: (conflict) =>
    set((s) => ({ conflicts: [...s.conflicts, conflict] })),

  resolveConflict: (aggregateId) =>
    set((s) => ({
      conflicts: s.conflicts.filter((c) => c.aggregateId !== aggregateId),
    })),

  setOfflineQueueSize: (offlineQueueSize) => set({ offlineQueueSize }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setShowCommentPanel: (showCommentPanel) => set({ showCommentPanel }),
  setShowParticipantList: (showParticipantList) => set({ showParticipantList }),
  setShowOfflinePanel: (showOfflinePanel) => set({ showOfflinePanel }),

  reset: () => set({ ...initialState, presence: new Map() }),
}));
