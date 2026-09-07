import { NextResponse } from "next/server";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { createComment, listComments } from "@/server/collaboration/comment-service";
import { requireSessionAccess } from "@/server/collaboration/authorization";
import { CreateCommentSchema } from "@/lib/collaboration/schemas";

export const runtime = "nodejs";
type Params = { params: Promise<{ sessionId: string }> };

export async function GET(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { sessionId } = await params;

  try {
    await requireSessionAccess(actor.userId, sessionId, "view");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "open" | "resolved" | null;
    const pageNumber = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const comments = await listComments(sessionId, { status: status ?? undefined, pageNumber });
    return NextResponse.json({ comments });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 403) return forbiddenError();
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed" } }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { sessionId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 }); }

  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_INPUT" } }, { status: 422 });

  try {
    const comment = await createComment(parsed.data, actor, sessionId);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 403) return forbiddenError();
    if (e.statusCode === 409) return NextResponse.json({ error: { code: "CONFLICT", message: e.message } }, { status: 409 });
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed" } }, { status: 500 });
  }
}
