import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { CreateAssemblySchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// GET /api/hvac/assemblies
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") ?? "default";
  try {
    const { assemblyService } = getTakeoffServices();
    const assemblies = await assemblyService.listAssemblies(organizationId);
    return NextResponse.json({ assemblies });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to list assemblies", 500);
  }
}

// POST /api/hvac/assemblies
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }
  const parsed = CreateAssemblySchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid assembly", 422, parsed.error.flatten());
  try {
    const { assemblyService } = getTakeoffServices();
    const assembly = await assemblyService.createAssembly(parsed.data as import("@/lib/takeoff/types").CreateAssemblyInput);
    return NextResponse.json({ assembly }, { status: 201 });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to create assembly", 500);
  }
}
