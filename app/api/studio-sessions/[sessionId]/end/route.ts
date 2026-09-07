import { NextResponse } from "next/server";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { endSession } from "@/server/collaboration/collaboration-service";

export const runtime = "nodejs";
type Params = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { sessionId } = await params;

  try {
    const session = await endSession(sessionId, actor);
    return NextResponse.json({ session });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 403) return forbiddenError();
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed" } }, { status: 500 });
  }
}
