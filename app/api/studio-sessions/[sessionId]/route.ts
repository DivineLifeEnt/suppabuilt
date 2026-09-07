import { NextResponse } from "next/server";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { requireSessionAccess } from "@/server/collaboration/authorization";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ sessionId: string }> };

export async function GET(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { sessionId } = await params;

  try {
    const session = await requireSessionAccess(actor.userId, sessionId, "view");
    return NextResponse.json({ session });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 403) return forbiddenError();
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { sessionId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 }); }

  try {
    await requireSessionAccess(actor.userId, sessionId, "session:manage");
    const { name, description } = body as { name?: string; description?: string };
    const updated = await prisma.collaborationSession.update({
      where: { id: sessionId },
      data: { ...(name ? { name } : {}), ...(description !== undefined ? { description } : {}) },
    });
    return NextResponse.json({ session: updated });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 403) return forbiddenError();
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed" } }, { status: 500 });
  }
}
