import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { DrawingVersionService } from "@/server/revisions/drawing-version-service";
import { CreateDrawingSetSchema } from "@/lib/revisions/schemas";

const svc = new DrawingVersionService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(_req);
  } catch {
    return authError();
  }
  const { projectId } = await params;
  try {
    await requirePermission(user.userId, projectId, "view");
  } catch {
    return Response.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }
  const sets = await svc.listDrawingSets(projectId);
  return Response.json({ drawingSets: sets });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { projectId } = await params;
  try {
    await requirePermission(user.userId, projectId, "project:manage");
  } catch {
    return Response.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, { status: 400 });
  }
  const parsed = CreateDrawingSetSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  }
  const set = await svc.createDrawingSetForProject(projectId, parsed.data, {
    userId: user.userId,
    orgId: user.orgId,
    name: user.name,
  });
  return Response.json({ drawingSet: set }, { status: 201 });
}
