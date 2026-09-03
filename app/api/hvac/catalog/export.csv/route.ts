import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";

export const runtime = "nodejs";

// GET /api/hvac/catalog/export.csv
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") ?? "default";

  try {
    const { catalogService } = getTakeoffServices();
    const items = await catalogService.listCatalog(organizationId, { active: undefined });
    const csv = catalogService.exportCatalogCsv(items);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hvac-catalog-${organizationId}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: { code: "INTERNAL", message: "Export failed" } }, { status: 500 });
  }
}
