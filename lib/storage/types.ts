import type { PlanRecord } from "@/types/plan";

export interface PlanStorage {
  save(file: File): Promise<PlanRecord>;
  get(id: string): Promise<{ record: PlanRecord; bytes: Buffer } | null>;
}
