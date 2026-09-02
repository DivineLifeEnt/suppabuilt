import { NextResponse } from "next/server";
import { exportCsv } from "@/server/measurement/measurement-export-service";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ planId: string }> };

const QuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).optional()),
});

// GET /api/plans/[planId]/measurements/export.csv
export async function GET(request: Request, { params }: Params) {
  const { planId } = await params;
  const { searchParams } = new URL(request.url);

  const queryResult = QuerySchema.safeParse({ page: searchParams.get("page") ?? undefined });
  if (!queryResult.success) {
    return NextResponse.json({ error: { code: "INVALID_QUERY", message: "Invalid query" } }, { status: 422 });
  }

  try {
    const csv = await exportCsv(planId, queryResult.data.page);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="measurements-${planId}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: { code: "INTERNAL", message: "Export failed" } }, { status: 500 });
  }
}
