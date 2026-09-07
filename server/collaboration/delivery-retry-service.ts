import { prisma } from "@/server/db";
import { getRealtimeProvider } from "./realtime-provider";
import type { RealtimeEvent } from "./realtime-provider";

export async function recordDeliveryFailure(
  channel: string,
  eventType: string,
  event: RealtimeEvent,
  error: Error
): Promise<void> {
  await prisma.realtimeDeliveryFailure.create({
    data: {
      channel,
      eventType,
      eventJson: JSON.stringify(event),
      lastError: error.message,
    },
  });
}

export async function retryPendingDeliveries(): Promise<{
  retried: number;
  resolved: number;
  failed: number;
}> {
  const failures = await prisma.realtimeDeliveryFailure.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const provider = getRealtimeProvider();
  let resolved = 0;
  let failed = 0;

  for (const failure of failures) {
    try {
      const event = JSON.parse(failure.eventJson) as RealtimeEvent;
      await provider.publish(failure.channel, failure.eventType, event);
      await prisma.realtimeDeliveryFailure.update({
        where: { id: failure.id },
        data: { resolvedAt: new Date() },
      });
      resolved++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.realtimeDeliveryFailure.update({
        where: { id: failure.id },
        data: {
          attemptCount: { increment: 1 },
          lastError: msg,
        },
      });
      failed++;
    }
  }

  return { retried: failures.length, resolved, failed };
}
