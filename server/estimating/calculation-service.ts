import { prisma } from "@/server/db";
import type { EstimateLine } from "@/lib/estimating/types";
import type { Money } from "@/lib/estimating/types";
import {
  calculateLineTotals,
  calculateDirectCost,
  calculateAdjustment,
} from "@/lib/estimating/calculations";
import type { EstimateLineTotals, EstimateAdjustment } from "@/lib/estimating/types";
import {
  addMoney,
  zeroMoney,
  roundMoney,
  roundMoney4dp,
  roundMoney2dp,
} from "@/lib/estimating/money";
import { addDecimal } from "@/lib/takeoff/decimal";
import { CALCULATION_POLICY_VERSION } from "@/lib/estimating/money";

export type VersionTotals = {
  currency: string;
  materialCost: Money;
  laborHours: string;
  laborCost: Money;
  equipmentCost: Money;
  subcontractCost: Money;
  otherDirectCost: Money;
  totalDirectCost: Money;
  adjustments: Array<{ id: string; label: string; amount: Money }>;
  taxes: Array<{ id: string; label: string; amount: Money }>;
  baseTotal: Money;
  includedAlternates: Money;
  optionalAlternates: Money;
  finalTotal: Money;
  calculationPolicyVersion: string;
};

export class CalculationService {
  async calculateLineTotals(line: EstimateLine, currency: string): Promise<EstimateLineTotals> {
    return calculateLineTotals(
      {
        quantity: line.quantity,
        unit: line.unit as never,
        unitMaterialCost: line.unitMaterialCost,
        laborHoursPerUnit: line.laborHoursPerUnit,
        burdenedLaborRate: line.burdenedLaborRate,
        unitEquipmentCost: line.unitEquipmentCost,
        unitSubcontractCost: line.unitSubcontractCost,
        unitOtherCost: line.unitOtherCost,
        wastePercent: line.wastePercent,
      },
      currency
    );
  }

  async calculateVersionTotals(versionId: string): Promise<VersionTotals> {
    const version = await prisma.estimateVersion.findUnique({ where: { id: versionId } });
    if (!version) throw Object.assign(new Error("Version not found"), { statusCode: 404 });

    const currency = version.currency;
    const lines = await prisma.estimateLine.findMany({ where: { versionId, included: true } });
    const adjustments = await prisma.estimateVersionAdjustment.findMany({
      where: { versionId },
      orderBy: { sortOrder: "asc" },
    });

    // Sum all included line totals
    let materialCost = zeroMoney(currency);
    let laborHours = "0";
    let laborCost = zeroMoney(currency);
    let equipmentCost = zeroMoney(currency);
    let subcontractCost = zeroMoney(currency);
    let otherCost = zeroMoney(currency);

    for (const line of lines) {
      const totals = await this.calculateLineTotals(line as EstimateLine, currency);
      materialCost = addMoney(materialCost, totals.materialCost);
      laborHours = addDecimal(laborHours, totals.laborHours);
      laborCost = addMoney(laborCost, totals.laborCost);
      equipmentCost = addMoney(equipmentCost, totals.equipmentCost);
      subcontractCost = addMoney(subcontractCost, totals.subcontractCost);
      otherCost = addMoney(otherCost, totals.otherCost);
    }

    // Stage 2: section subtotals → 4dp (we sum all lines, so round here)
    materialCost = roundMoney4dp(materialCost);
    laborCost = roundMoney4dp(laborCost);
    equipmentCost = roundMoney4dp(equipmentCost);
    subcontractCost = roundMoney4dp(subcontractCost);
    otherCost = roundMoney4dp(otherCost);

    const totalDirectCost = roundMoney4dp(
      calculateDirectCost(materialCost, laborCost, equipmentCost, subcontractCost, otherCost)
    );

    // Apply adjustments (non-tax)
    const adjResults: Array<{ id: string; label: string; amount: Money }> = [];
    const taxResults: Array<{ id: string; label: string; amount: Money }> = [];

    let runningTotal = { ...totalDirectCost };

    for (const adj of adjustments) {
      if (adj.kind === "tax") continue;

      const adjDomain: EstimateAdjustment = adj.kind === "fixed"
        ? {
            id: adj.id, kind: "fixed",
            amount: { amount: adj.fixedAmount ?? "0", currency: adj.currency ?? currency },
            basis: adj.basis as EstimateAdjustment["basis"],
            label: adj.label, order: adj.sortOrder, taxable: adj.taxable,
            policySnapshot: JSON.parse(adj.policySnapshot),
          }
        : {
            id: adj.id, kind: adj.kind as "markup" | "margin",
            rate: adj.rate ?? "0",
            basis: adj.basis as EstimateAdjustment["basis"],
            label: adj.label, order: adj.sortOrder, taxable: adj.taxable,
            policySnapshot: JSON.parse(adj.policySnapshot),
          };

      const basis = this._getBasis(adj.basis, { materialCost, laborCost, equipmentCost, subcontractCost, otherCost, totalDirectCost }, currency);
      const amount = roundMoney2dp(calculateAdjustment(adjDomain, basis));
      adjResults.push({ id: adj.id, label: adj.label, amount });
      runningTotal = addMoney(runningTotal, amount);
    }

    const baseTotal = roundMoney(runningTotal);

    // Apply taxes
    for (const adj of adjustments) {
      if (adj.kind !== "tax") continue;
      const adjDomain: EstimateAdjustment = {
        id: adj.id, kind: "tax", rate: adj.rate ?? "0",
        basis: adj.basis as EstimateAdjustment["basis"],
        label: adj.label, order: adj.sortOrder, taxable: adj.taxable,
        policySnapshot: JSON.parse(adj.policySnapshot),
      };
      const basis = this._getBasis(adj.basis, { materialCost, laborCost, equipmentCost, subcontractCost, otherCost, totalDirectCost: baseTotal }, currency);
      const amount = roundMoney2dp(calculateAdjustment(adjDomain, basis));
      taxResults.push({ id: adj.id, label: adj.label, amount });
      runningTotal = addMoney(runningTotal, amount);
    }

    const finalTotal = roundMoney(runningTotal);

    return {
      currency,
      materialCost, laborHours, laborCost, equipmentCost,
      subcontractCost, otherDirectCost: otherCost, totalDirectCost,
      adjustments: adjResults, taxes: taxResults,
      baseTotal, includedAlternates: zeroMoney(currency),
      optionalAlternates: zeroMoney(currency), finalTotal,
      calculationPolicyVersion: CALCULATION_POLICY_VERSION,
    };
  }

  private _getBasis(
    basis: string,
    costs: { materialCost: Money; laborCost: Money; equipmentCost: Money; subcontractCost: Money; otherCost: Money; totalDirectCost: Money },
    currency: string
  ): Money {
    switch (basis) {
      case "material": return costs.materialCost;
      case "labor": return costs.laborCost;
      case "equipment": return costs.equipmentCost;
      case "subcontract": return costs.subcontractCost;
      case "other": return costs.otherCost;
      case "all-direct":
      case "custom":
      default:
        return costs.totalDirectCost;
    }
    void currency;
  }
}
