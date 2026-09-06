import { NextResponse } from "next/server";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { requireSessionAccess } from "@/server/collaboration/authorization";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ sessionId: string }> };

const PAGE_SIZE = 50;

export async function GET(request: Request, { params }: Params): Promise<Response> {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }

  const { sessionId } = await params;

  try {
    await requireSessionAccess(actor.userId, sessionId, "view");
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 403) return forbiddenError();
    return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;

  const events = await prisma.auditEvent.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = events.length > PAGE_SIZE;
  const page = hasMore ? events.slice(0, PAGE_SIZE) : events;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return NextResponse.json({ events: page, nextCursor });
}
