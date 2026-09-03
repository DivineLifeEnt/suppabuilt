import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";

export const runtime = "nodejs";

type Params = { params: Promise<{ planId: string }> };

// GET /api/plans/[planId]/takeoff-export.csv
export async function GET(request: Request, { params }: Params) {
  const { planId } = await params;
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") ?? "default";

  const filter = {
    systemId: searchParams.get("systemId") ?? undefined,
    zoneId: searchParams.get("zoneId") ?? undefined,
    levelId: searchParams.get("levelId") ?? undefined,
    phaseId: searchParams.get("phaseId") ?? undefined,
    status: (searchParams.get("status") ?? undefined) as "open" | "resolved" | undefined,
  };

  try {
    const { exportService } = getTakeoffServices();
    const csv = await exportService.exportTakeoffCsv(planId, organizationId, filter, { planName: planId });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="takeoff-${planId}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: { code: "INTERNAL", message: "Export failed" } }, { status: 500 });
  }
}
