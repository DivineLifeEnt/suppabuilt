import { NextResponse } from "next/server";
import { planStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await planStorage.get(id);
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(result.bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.record.name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
