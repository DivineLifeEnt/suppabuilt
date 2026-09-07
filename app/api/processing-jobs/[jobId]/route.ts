import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { getJobService } from "@/server/revisions/processing-job-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { jobId } = await params;
  try {
    const job = await getJobService().getJob(jobId);
    void user;
    return Response.json({ job });
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    throw err;
  }
}
