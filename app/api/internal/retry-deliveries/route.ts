import { NextResponse } from "next/server";
import { retryPendingDeliveries } from "@/server/collaboration/delivery-retry-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await retryPendingDeliveries();
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
