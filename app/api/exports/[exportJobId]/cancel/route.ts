import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { getExportJobService } from "@/server/exports/export-job-service";

const svc = getExportJobService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ exportJobId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { exportJobId } = await params;
  try {
    await svc.cancelExportJob(exportJobId, user.userId);
    return Response.json({ ok: true });
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    return Response.json({ error: { code: "ERROR", message: e.message } }, { status: e.statusCode ?? 500 });
  }
}
