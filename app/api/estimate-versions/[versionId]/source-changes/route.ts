import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/collaboration/auth";
import { requirePermission } from "@/server/collaboration/authorization";
import { prisma } from "@/server/db";
import { SourceRefreshService } from "@/server/estimating/source-refresh-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  const actor = await requireAuth(req);
  const version = await prisma.estimateVersion.findUnique({
    where: { id: params.versionId },
    include: { estimate: true },
  });
  if (!version) return NextResponse.json({ error: "not found" }, { status: 404 });

  await requirePermission(actor.userId, version.estimate.projectId, "estimate:view");

  const service = new SourceRefreshService();
  const preview = await service.previewRefresh(params.versionId, actor.userId);

  return NextResponse.json({ preview });
}
