import { NextResponse } from "next/server";
import { planStorage } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_SIZE = 100 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF to upload." }, { status: 400 });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))
      return NextResponse.json({ error: "Only PDF plan sets are supported." }, { status: 415 });
    if (!file.size) return NextResponse.json({ error: "The selected PDF is empty." }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "PDFs must be 100 MB or smaller." }, { status: 413 });
    return NextResponse.json(await planStorage.save(file), { status: 201 });
  } catch {
    return NextResponse.json({ error: "The plan could not be stored. Try again." }, { status: 500 });
  }
}
