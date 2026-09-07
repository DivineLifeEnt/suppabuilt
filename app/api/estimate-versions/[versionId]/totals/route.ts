import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { CalculationService } from "@/server/estimating/calculation-service";
import { prisma } from "@/server/db";

const calcSvc = new CalculationService();

async function getProjectId(versionId: string) {
  const v = await prisma.estimateVersion.findUnique({ where: { id: versionId }, include: { estimate: true } });
  return v?.estimate?.projectId ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
): Promise<Response> {
  let user;
  try { user = await requireAuth(req); } catch { return authError(); }
  const { versionId } = await params;
  const projectId = await getProjectId(versionId);
  if (!projectId) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  try { await requirePermission(user.userId, projectId, "estimate:view"); }
  catch { return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }

  // Check if user can see cost details
  let canViewCost = false;
  try { await requirePermission(user.userId, projectId, "estimate:view-cost"); canViewCost = true; }
  catch { /* no cost permission */ }

  const totals = await calcSvc.calculateVersionTotals(versionId);

  if (!canViewCost) {
    // Redact cost details
    return Response.json({
      totals: {
        currency: totals.currency,
        laborHours: totals.laborHours,
        calculationPolicyVersion: totals.calculationPolicyVersion,
      },
    });
  }

  return Response.json({ totals });
}
