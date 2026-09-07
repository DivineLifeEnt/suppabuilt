import { NextResponse } from "next/server";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { requireSessionAccess } from "@/server/collaboration/authorization";
import { getRealtimeProvider } from "@/server/collaboration/realtime-provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }

  let body: Record<string, string>;
  try {
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { socket_id: socketId, channel_name: channel } = body;
  if (!socketId || !channel) {
    return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
  }

  // Extract sessionId from channel name: private-session-{id} or presence-session-{id}
  const match = channel.match(/^(?:private|presence)-session-(.+)$/);
  if (!match) return NextResponse.json({ error: "Unknown channel" }, { status: 403 });
  const sessionId = match[1];

  try {
    await requireSessionAccess(actor.userId, sessionId, "view");
  } catch {
    return forbiddenError();
  }

  const provider = getRealtimeProvider();
  const auth = await provider.authorize({ socketId, channel, userId: actor.userId, sessionId });
  return NextResponse.json(auth);
}
