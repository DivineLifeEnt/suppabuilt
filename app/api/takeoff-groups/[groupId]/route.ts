import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { UpdateGroupSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";
type Params = { params: Promise<{ groupId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { groupId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const parsed = UpdateGroupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { repos } = getTakeoffServices();
  const group = await repos.groups.update(groupId, parsed.data);
  return NextResponse.json({ group });
}
export async function DELETE(_req: Request, { params }: Params) {
  const { groupId } = await params;
  const { repos } = getTakeoffServices();
  await repos.groups.delete(groupId);
  return NextResponse.json({ deleted: groupId });
}
