import { NextResponse } from "next/server";
import { getRealtimeProvider } from "@/server/collaboration/realtime-provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-pusher-signature") ?? "";

  const provider = getRealtimeProvider();
  if (!provider.verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Process webhook events idempotently (presence changes etc.)
  // For now just acknowledge — real processing would update presence TTL
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: true }); }
  void payload;

  return NextResponse.json({ ok: true });
}
