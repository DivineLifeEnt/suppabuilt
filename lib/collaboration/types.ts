import type { NormalizedPoint } from "@/lib/markup/types";
import type { OrganizationRole, ProjectRole } from "./permissions";

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMembership = {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
};

export type StudioSession = {
  id: string;
  planId: string;
  projectId: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: "active" | "ended" | "archived";
  createdBy: string;
  endedBy: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionParticipant = {
  id: string;
  sessionId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  leftAt: string | null;
};

export type PresenceState = {
  userId: string;
  name: string;
  color: string;
  planId: string;
  pageNumber: number;
  cursor: NormalizedPoint | null;
  activeTool: string | null;
  selectedIds: string[];
  isTyping: boolean;
  lastSeen: string;
};

export type Comment = {
  id: string;
  sessionId: string;
  planId: string;
  pageNumber: number | null;
  parentId: string | null;
  pin: NormalizedPoint | null;
  targetType: "markup" | "measurement" | "takeoff" | "plan" | null;
  targetId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  status: "open" | "resolved";
  resolvedBy: string | null;
  resolvedAt: string | null;
  deletedAt: string | null;
  assigneeId: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type Mention = {
  id: string;
  commentId: string;
  mentionedUserId: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  organizationId: string;
  projectId: string;
  sessionId: string | null;
  actorId: string;
  actorName: string;
  action: string;
  aggregateType: string;
  aggregateId: string;
  previousRevision: number | null;
  resultingRevision: number | null;
  patchJson: string | null;
  origin: "online" | "offline-replay" | "import" | "system";
  correlationId: string;
  createdAt: string;
};
