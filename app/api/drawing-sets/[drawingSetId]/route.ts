import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { DrawingVersionService } from "@/server/revisions/drawing-version-service";
import { UpdateDrawingSetSchema } from "@/lib/revisions/schemas";
import { prisma } from "@/server/db";

const svc = new DrawingVersionService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ drawingSetId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { drawingSetId } = await params;
  try {
    const set = await svc.getDrawingSet(drawingSetId);
    return Response.json({ drawingSet: set });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ drawingSetId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { drawingSetId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }
  const parsed = UpdateDrawingSetSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  }
  const updated = await prisma.drawingSet.update({
    where: { id: drawingSetId },
    data: {
      name: parsed.data.name,
      discipline: parsed.data.discipline,
    },
  });
  void user;
  return Response.json({
    drawingSet: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
