import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PlanRecord } from "@/types/plan";
import type { PlanStorage } from "./types";

const root = path.join(process.cwd(), "storage", "plans");

export class LocalPlanStorage implements PlanStorage {
  async save(file: File): Promise<PlanRecord> {
    await mkdir(root, { recursive: true });
    const id = randomUUID();
    const record: PlanRecord = {
      id,
      name: file.name,
      size: file.size,
      mimeType: "application/pdf",
      createdAt: new Date().toISOString(),
      url: `/api/plans/${id}`,
    };
    await Promise.all([
      writeFile(path.join(root, `${id}.pdf`), Buffer.from(await file.arrayBuffer())),
      writeFile(path.join(root, `${id}.json`), JSON.stringify(record, null, 2)),
    ]);
    return record;
  }

  async get(id: string) {
    if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
    try {
      const [metadata, bytes] = await Promise.all([
        readFile(path.join(root, `${id}.json`), "utf8"),
        readFile(path.join(root, `${id}.pdf`)),
      ]);
      return { record: JSON.parse(metadata) as PlanRecord, bytes };
    } catch {
      return null;
    }
  }
}
