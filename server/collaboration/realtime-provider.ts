import Pusher from "pusher";

export type RealtimeEvent = {
  protocolVersion: 1;
  eventId: string;
  idempotencyKey: string;
  type: string;
  organizationId: string;
  projectId: string;
  planId: string;
  sessionId: string;
  aggregateType: "markup" | "measurement" | "calibration" | "takeoff" | "comment" | "session" | "presence";
  aggregateId: string;
  aggregateRevision: number;
  actor: { id: string; name: string };
  occurredAt: string;
  payload: unknown;
};

export type ChannelAuthorizationInput = {
  socketId: string;
  channel: string;
  userId: string;
  sessionId: string;
};

export type ChannelAuthorization = {
  auth: string;
  channel_data?: string;
};

export interface RealtimeProvider {
  publish(channel: string, eventType: string, event: RealtimeEvent): Promise<void>;
  authorize(input: ChannelAuthorizationInput): Promise<ChannelAuthorization>;
  verifyWebhook(rawBody: string, signature: string): boolean;
}

export class PusherProvider implements RealtimeProvider {
  private client: Pusher;

  constructor() {
    this.client = new Pusher({
      appId: process.env.REALTIME_APP_ID!,
      key: process.env.REALTIME_KEY!,
      secret: process.env.REALTIME_SECRET!,
      cluster: process.env.REALTIME_CLUSTER ?? "mt1",
      useTLS: true,
    });
  }

  async publish(channel: string, eventType: string, event: RealtimeEvent): Promise<void> {
    await this.client.trigger(channel, eventType, event);
  }

  async authorize(input: ChannelAuthorizationInput): Promise<ChannelAuthorization> {
    if (input.channel.startsWith("presence-")) {
      const presenceData = {
        user_id: input.userId,
        user_info: { sessionId: input.sessionId },
      };
      return this.client.authorizeChannel(
        input.socketId,
        input.channel,
        presenceData
      ) as ChannelAuthorization;
    }
    return this.client.authorizeChannel(input.socketId, input.channel) as ChannelAuthorization;
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    const webhook = new Pusher.Webhook(this.client);
    try {
      webhook.verify(rawBody, signature);
      return true;
    } catch {
      return false;
    }
  }
}

export class FakeRealtimeProvider implements RealtimeProvider {
  published: Array<{ channel: string; eventType: string; event: RealtimeEvent }> = [];

  async publish(channel: string, eventType: string, event: RealtimeEvent): Promise<void> {
    this.published.push({ channel, eventType, event });
  }

  async authorize(input: ChannelAuthorizationInput): Promise<ChannelAuthorization> {
    return { auth: `fake:${input.socketId}` };
  }

  verifyWebhook(): boolean {
    return true;
  }

  clear(): void {
    this.published = [];
  }
}

let _provider: RealtimeProvider | null = null;

export function getRealtimeProvider(): RealtimeProvider {
  if (_provider) return _provider;

  const kind = process.env.REALTIME_PROVIDER;
  if (
    kind === "pusher" &&
    process.env.REALTIME_APP_ID &&
    process.env.REALTIME_KEY &&
    process.env.REALTIME_SECRET
  ) {
    _provider = new PusherProvider();
  } else {
    _provider = new FakeRealtimeProvider();
  }
  return _provider;
}

/** Reset provider (useful in tests) */
export function resetRealtimeProvider(): void {
  _provider = null;
}
