import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { getExportJobService } from "@/server/exports/export-job-service";
import { CreateExportJobSchema } from "@/lib/estimating/schemas";

const svc = getExportJobService();

export async function POST(req: NextRequest): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 }); }
  const parsed = CreateExportJobSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });

  const { projectId, exportType, sourceIds, idempotencyKey, versionId, includeInternal, templateId } = parsed.data;

  // Check permission based on export type
  const isCustomerFacing = exportType === "estimate-customer-pdf" || !includeInternal;
  const permission = isCustomerFacing ? "export:create-customer" : "export:create-internal";
  try { await requirePermission(user.userId, projectId, permission); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }

  const job = await svc.createExportJob(
    {
      projectId,
      organizationId: user.orgId,
      exportType,
      sourceIds,
      templateId: templateId ?? null,
      idempotencyKey,
      versionId: versionId ?? null,
      includeInternal: includeInternal !== false,
    },
    { userId: user.userId }
  );

  return Response.json({ job }, { status: 202 });
}
