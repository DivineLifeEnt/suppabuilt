import { prisma } from "@/server/db";

export interface OrgAIPolicy {
  id: string;
  orgId: string;
  aiEnabled: boolean;
  monthlyLimitUsd: unknown; // Decimal in DB
  createdAt: Date;
  updatedAt: Date;
}

export async function getOrgAIPolicy(orgId: string): Promise<OrgAIPolicy | null> {
  return prisma.aIOrganizationPolicy.findUnique({ where: { orgId } }) as Promise<OrgAIPolicy | null>;
}

export async function setOrgAIPolicy(
  orgId: string,
  input: { monthlyLimitUsd: number }
): Promise<OrgAIPolicy> {
  return prisma.aIOrganizationPolicy.upsert({
    where: { orgId },
    create: {
      orgId,
      aiEnabled: false,
      monthlyLimitUsd: input.monthlyLimitUsd,
    },
    update: {
      monthlyLimitUsd: input.monthlyLimitUsd,
    },
  }) as Promise<OrgAIPolicy>;
}

export function isAIEnabled(): boolean {
  return process.env.AI_ENABLED === "true";
}
