import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { CreateCatalogItemSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// GET /api/hvac/catalog
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") ?? "default";
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const activeParam = searchParams.get("active");
  const active = activeParam === null ? undefined : activeParam !== "false";

  try {
    const { catalogService } = getTakeoffServices();
    const items = await catalogService.listCatalog(organizationId, {
      category: category as Parameters<typeof catalogService.listCatalog>[1] extends { category?: infer C } ? C : undefined,
      active,
      search,
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to list catalog items", 500);
  }
}

// POST /api/hvac/catalog
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const parsed = CreateCatalogItemSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid catalog item", 422, parsed.error.flatten());

  try {
    const { catalogService } = getTakeoffServices();
    const item = await catalogService.createCatalogItem(parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to create catalog item", 500);
  }
}
