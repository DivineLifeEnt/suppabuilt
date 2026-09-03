import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// POST /api/hvac/catalog/import
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let csvText: string;
  let organizationId: string = "default";
  let authorName: string = "Import";

  if (contentType.includes("application/json")) {
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }
    const b = body as Record<string, unknown>;
    if (typeof b["csvText"] !== "string") return apiError("VALIDATION", "csvText field required", 422);
    csvText = b["csvText"] as string;
    organizationId = typeof b["organizationId"] === "string" ? b["organizationId"] : "default";
    authorName = typeof b["authorName"] === "string" ? b["authorName"] : "Import";
  } else if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    organizationId = (form.get("organizationId") as string) ?? "default";
    authorName = (form.get("authorName") as string) ?? "Import";
    if (!file || typeof file === "string") return apiError("VALIDATION", "file field required", 422);
    csvText = await (file as File).text();
  } else {
    csvText = await request.text();
    const { searchParams } = new URL(request.url);
    organizationId = searchParams.get("organizationId") ?? "default";
    authorName = searchParams.get("authorName") ?? "Import";
  }

  try {
    const { catalogService } = getTakeoffServices();
    const result = await catalogService.importCatalogCsv(csvText, organizationId, authorName);
    if (result.errors.length > 0) {
      return NextResponse.json({ imported: 0, errors: result.errors }, { status: 422 });
    }
    return NextResponse.json({ imported: result.imported });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to import catalog", 500);
  }
}
