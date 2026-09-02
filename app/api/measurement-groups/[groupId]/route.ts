import { NextResponse } from "next/server";
import {
  getMeasurementGroupRepository,
  getMeasurementRepository,
  NotFoundError,
} from "@/server/measurement/repositories";
import { UpdateGroupSchema } from "@/lib/measurement/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ groupId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// PATCH /api/measurement-groups/[groupId]
export async function PATCH(request: Request, { params }: Params) {
  const { groupId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = UpdateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid group update", 422, parsed.error.flatten());
  }

  try {
    const repo = getMeasurementGroupRepository();
    const group = await repo.update(groupId, parsed.data);
    return NextResponse.json({ group });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return apiError("NOT_FOUND", "Group not found", 404);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to update group", 500);
  }
}

// DELETE /api/measurement-groups/[groupId]
export async function DELETE(request: Request, { params }: Params) {
  const { groupId } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  try {
    const gRepo = getMeasurementGroupRepository();
    const group = await gRepo.get(groupId);
    if (!group) return apiError("NOT_FOUND", "Group not found", 404);

    if (!force) {
      const mRepo = getMeasurementRepository();
      const measurements = await mRepo.list(group.planId);
      const assigned = measurements.filter((m) => m.groupId === groupId);
      if (assigned.length > 0) {
        return apiError(
          "DEPENDENCY",
          `${assigned.length} measurement(s) are assigned to this group. Use force=true to delete anyway.`,
          409
        );
      }
    }

    await gRepo.delete(groupId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return apiError("NOT_FOUND", "Group not found", 404);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to delete group", 500);
  }
}
