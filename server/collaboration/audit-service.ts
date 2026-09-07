import { prisma } from "@/server/db";
import type { AuditEvent } from "@/lib/collaboration/types";

const SECRET_PATTERNS = [
  /password/i, /secret/i, /token/i, /key/i, /auth/i, /credential/i,
];

/** Redact any field matching known secret patterns before persisting patchJson */
export function redactPatch(patch: unknown): string {
  const redacted = JSON.parse(JSON.stringify(patch ?? null), (key, value) => {
    if (SECRET_PATTERNS.some((p) => p.test(key))) return "[REDACTED]";
    return value;
  });
  return JSON.stringify(redacted);
}

/** Append-only: never update or delete audit records */
export async function recordAudit(
  event: Omit<AuditEvent, "id" | "createdAt">
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      organizationId: event.organizationId,
      projectId: event.projectId,
      sessionId: event.sessionId,
      actorId: event.actorId,
      actorName: event.actorName,
      action: event.action,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      previousRevision: event.previousRevision,
      resultingRevision: event.resultingRevision,
      patchJson: event.patchJson ? redactPatch(JSON.parse(event.patchJson)) : null,
      origin: event.origin,
      correlationId: event.correlationId,
    },
  });
}
