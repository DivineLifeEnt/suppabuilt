import { NextResponse } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { leaveSession } from "@/server/collaboration/collaboration-service";

export const runtime = "nodejs";
type Params = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { sessionId } = await params;
  await leaveSession(sessionId, actor);
  return NextResponse.json({ ok: true });
}
