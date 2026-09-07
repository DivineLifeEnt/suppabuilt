import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { PageMatchingService } from "@/server/revisions/page-matching-service";

const svc = new PageMatchingService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { versionId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const compVersionId = b.comparisonVersionId as string | undefined;
  if (!compVersionId) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "comparisonVersionId required" } }, { status: 400 });
  }
  try {
    const matches = await svc.finalizeMatches(versionId, compVersionId, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ matches });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 422) return Response.json({ error: { code: e.code ?? "UNPROCESSABLE", message: e.message } }, { status: 422 });
    throw err;
  }
}
