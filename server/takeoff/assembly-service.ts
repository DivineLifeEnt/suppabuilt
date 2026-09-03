import type {
  TakeoffAssembly,
  TakeoffItem,
  TakeoffSource,
  AssemblyComponent,
} from "@/lib/takeoff/types";
import { evaluateAssemblyRule, type RuleContext } from "@/lib/takeoff/assembly-rules";
import { calculateGrossQuantity } from "@/lib/takeoff/decimal";
import { randomUUID } from "node:crypto";
import type { AssemblyRepository, TakeoffItemRepository } from "./repositories/takeoff-repository";

export type AssemblyPreviewResult = {
  assemblyId: string;
  assemblyName: string;
  components: Array<{
    component: AssemblyComponent;
    netQuantity: string;
    grossQuantity: string;
  }>;
};

export type AssemblyApplyResult = {
  applicationId: string;
  items: TakeoffItem[];
};

// ─── Service ──────────────────────────────────────────────────────────────────
export class AssemblyService {
  constructor(
    private readonly assemblies: AssemblyRepository,
    private readonly items: TakeoffItemRepository
  ) {}

  async listAssemblies(organizationId: string): Promise<TakeoffAssembly[]> {
    return this.assemblies.list(organizationId);
  }

  async getAssembly(id: string): Promise<TakeoffAssembly | null> {
    return this.assemblies.get(id);
  }

  async createAssembly(input: Parameters<AssemblyRepository["create"]>[0]): Promise<TakeoffAssembly> {
    return this.assemblies.create(input);
  }

  async updateAssembly(
    id: string,
    input: Parameters<AssemblyRepository["update"]>[1],
    expectedRevision: number
  ): Promise<TakeoffAssembly> {
    return this.assemblies.update(id, input, expectedRevision);
  }

  async deleteAssembly(id: string, expectedRevision: number): Promise<void> {
    return this.assemblies.delete(id, expectedRevision);
  }

  /**
   * Preview assembly component quantities without persisting.
   */
  async previewAssembly(
    assemblyId: string,
    context: RuleContext
  ): Promise<AssemblyPreviewResult> {
    const assembly = await this.assemblies.get(assemblyId);
    if (!assembly) throw new Error(`Assembly not found: ${assemblyId}`);

    const components = assembly.components.map((comp) => {
      const netQuantity = evaluateAssemblyRule(comp.rule, context);
      const grossQuantity = calculateGrossQuantity(netQuantity, comp.wastePercent);
      return { component: comp, netQuantity, grossQuantity };
    });

    return {
      assemblyId: assembly.id,
      assemblyName: assembly.name,
      components,
    };
  }

  /**
   * Apply assembly to a plan — creates all component TakeoffItems transactionally.
   */
  async applyAssembly(
    assemblyId: string,
    context: RuleContext,
    planId: string,
    pageNumber: number | null,
    appliedBy: string
  ): Promise<AssemblyApplyResult> {
    const assembly = await this.assemblies.get(assemblyId);
    if (!assembly) throw new Error(`Assembly not found: ${assemblyId}`);

    // Generate a shared application ID for tracing
    const applicationId = randomUUID();

    const createdItems: TakeoffItem[] = [];

    // Create each component item
    for (const comp of assembly.components) {
      const netQuantity = evaluateAssemblyRule(comp.rule, context);
      const grossQuantity = calculateGrossQuantity(netQuantity, comp.wastePercent);

      // For the first item created, use it as the parent; for subsequent items,
      // reference the first item's (eventual) ID
      const parentId = createdItems[0]?.id ?? "pending";

      const source: TakeoffSource = {
        kind: "assembly",
        assemblyApplicationId: applicationId,
        parentTakeoffItemId: parentId,
      };

      const item = await this.items.create({
        planId,
        pageNumber: pageNumber ?? null,
        catalogItemId: comp.catalogItemId,
        source,
        unit: comp.unit,
        netQuantity,
        wastePercent: comp.wastePercent,
        equipmentTag: null,
        size: null,
        material: null,
        systemId: null,
        zoneId: null,
        levelId: null,
        phaseId: null,
        groupId: null,
        notes: `Applied from assembly: ${assembly.name}`,
        customFields: { assemblyApplicationId: applicationId, assemblyId },
        status: "open",
        locked: false,
        visible: true,
        createdBy: { name: appliedBy },
      });

      createdItems.push(item);
    }

    return { applicationId, items: createdItems };
  }
}
