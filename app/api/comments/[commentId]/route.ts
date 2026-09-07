import { NextResponse } from "next/server";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { editComment, softDeleteComment } from "@/server/collaboration/comment-service";
import { EditCommentSchema } from "@/lib/collaboration/schemas";

export const runtime = "nodejs";
type Params = { params: Promise<{ commentId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { commentId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 }); }

  const parsed = EditCommentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_INPUT" } }, { status: 422 });

  try {
    const comment = await editComment(commentId, parsed.data.body, actor);
    return NextResponse.json({ comment });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 403) return forbiddenError();
    if (e.statusCode === 404) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    if (e.statusCode === 409) return NextResponse.json({ error: { code: "CONFLICT", message: e.message } }, { status: 409 });
    return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { commentId } = await params;

  try {
    await softDeleteComment(commentId, actor);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 403) return forbiddenError();
    if (e.statusCode === 404) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
