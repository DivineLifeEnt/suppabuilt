import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { aggregateTakeoff } from "@/lib/takeoff/aggregation";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Params = { params: Promise<{ planId: string }> };

// GET /api/plans/[planId]/takeoff-summary
export async function GET(request: Request, { params }: Params) {
  const { planId } = await params;
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") ?? "default";

  try {
    const { repos } = getTakeoffServices();
    const items = await repos.items.list(planId);
    const catalogItems = await repos.catalog.list(organizationId);
    const catalogMap = new Map(catalogItems.map((c) => [c.id, c]));
    const totals = aggregateTakeoff(items, catalogMap);
    return NextResponse.json({ totals, totalItems: items.length });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to get takeoff summary", 500);
  }
}
