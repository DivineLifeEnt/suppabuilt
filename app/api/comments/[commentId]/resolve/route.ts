import { NextResponse } from "next/server";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { resolveComment } from "@/server/collaboration/comment-service";

export const runtime = "nodejs";
type Params = { params: Promise<{ commentId: string }> };

export async function POST(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { commentId } = await params;

  try {
    const comment = await resolveComment(commentId, actor);
    return NextResponse.json({ comment });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 403) return forbiddenError();
    if (e.statusCode === 404) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
