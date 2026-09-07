import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { ComparisonService } from "@/server/revisions/comparison-service";
import { randomUUID } from "node:crypto";

const svc = new ComparisonService();

export async function GET(
  req: NextRequest
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const url = new URL(req.url);
  const drawingSetId = url.searchParams.get("drawingSetId");
  if (!drawingSetId) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "drawingSetId required" } }, { status: 400 });
  }
  const comparisons = await svc.listComparisons(drawingSetId);
  void user;
  return Response.json({ comparisons });
}

export async function POST(
  req: NextRequest
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const pageMatchId = b.pageMatchId as string | undefined;
  const idempotencyKey = (b.idempotencyKey as string | undefined) ?? randomUUID();
  if (!pageMatchId) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "pageMatchId required" } }, { status: 400 });
  }
  try {
    const comparison = await svc.createComparison(pageMatchId, idempotencyKey, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ comparison }, { status: 201 });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
