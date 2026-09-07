import { NextResponse } from "next/server";
import { requireAuth, authError, forbiddenError } from "@/server/collaboration/auth";
import { createSession } from "@/server/collaboration/collaboration-service";
import { prisma } from "@/server/db";
import { CreateSessionSchema } from "@/lib/collaboration/schemas";

export const runtime = "nodejs";
type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { projectId } = await params;

  try {
    const sessions = await prisma.collaborationSession.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed" } }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  let actor;
  try { actor = await requireAuth(request); } catch { return authError(); }
  const { projectId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { code: "INVALID_JSON", message: "Invalid JSON" } }, { status: 400 }); }

  const parsed = CreateSessionSchema.safeParse({ ...(body as object), projectId });
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Invalid input" } }, { status: 422 });

  try {
    const session = await createSession(parsed.data, actor);
    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 403) return forbiddenError();
    console.error(err);
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed" } }, { status: 500 });
  }
}
