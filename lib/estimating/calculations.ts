/**
 * Estimating calculations — all inputs/outputs are decimal strings.
 * BigInt-scaled arithmetic internally via lib/takeoff/decimal.ts.
 *
 * Rounding policy (CALCULATION_POLICY_VERSION = "1"):
 *   Stage 1: per-line directCost → 4dp
 *   Stage 2: section subtotal    → 4dp
 *   Stage 3: adjustment amount   → 2dp
 *   Stage 4: final total         → currency minor units
 */

import type { Money, EstimateLineInput, EstimateLineTotals, EstimateAdjustment } from "./types";
import {
  addMoney,
  multiplyMoney,
  zeroMoney,
  roundMoney2dp,
  roundMoney4dp,
} from "./money";
import {
  multiplyDecimal,
  addDecimal,
  divideDecimal,
  parseDecimal,
} from "@/lib/takeoff/decimal";

// ─── Error types ──────────────────────────────────────────────────────────────

export class MarginRateError extends Error {
  constructor(rate: string) {
    super(`Margin rate must be >= 0 and < 1, got: ${rate}`);
    this.name = "MarginRateError";
  }
}

// ─── Quantity ─────────────────────────────────────────────────────────────────

/** grossQty = netQty × (1 + wastePercent / 100) */
export function calculateGrossQuantity(netQty: string, wastePercent: string): string {
  const wasteFraction = divideDecimal(wastePercent, "100");
  const multiplier = addDecimal("1", wasteFraction);
  return multiplyDecimal(netQty, multiplier);
}

// ─── Cost components ─────────────────────────────────────────────────────────

export function calculateMaterialCost(
  grossQty: string,
  unitMaterialCost: string,
  currency: string
): Money {
  return { amount: multiplyDecimal(grossQty, unitMaterialCost), currency };
}

export function calculateLaborHours(qty: string, hoursPerUnit: string): string {
  return multiplyDecimal(qty, hoursPerUnit);
}

export function calculateLaborCost(
  laborHours: string,
  burdenedRate: string,
  currency: string
): Money {
  return { amount: multiplyDecimal(laborHours, burdenedRate), currency };
}

export function calculateEquipmentCost(
  qty: string,
  unitCost: string,
  currency: string
): Money {
  return { amount: multiplyDecimal(qty, unitCost), currency };
}

export function calculateSubcontractCost(
  qty: string,
  unitCost: string,
  currency: string
): Money {
  return { amount: multiplyDecimal(qty, unitCost), currency };
}

export function calculateOtherCost(
  qty: string,
  unitOtherCost: string,
  currency: string
): Money {
  return { amount: multiplyDecimal(qty, unitOtherCost), currency };
}

export function calculateDirectCost(
  material: Money,
  labor: Money,
  equipment: Money,
  subcontract: Money,
  other: Money
): Money {
  let total = addMoney(material, labor);
  total = addMoney(total, equipment);
  total = addMoney(total, subcontract);
  total = addMoney(total, other);
  return total;
}

// ─── Adjustments ─────────────────────────────────────────────────────────────

/**
 * sellPrice = cost × (1 + rate)
 * Returns the markup AMOUNT (sellPrice − cost), not the sell price.
 */
export function calculateMarkup(cost: Money, rate: string): Money {
  const sellPrice = multiplyMoney(cost, addDecimal("1", rate));
  return { amount: addDecimal(sellPrice.amount, `-${cost.amount}`), currency: cost.currency };
}

/**
 * sellPrice = cost / (1 − rate)
 * Returns the margin AMOUNT (sellPrice − cost).
 * Throws MarginRateError if rate >= 1.0 or rate < 0.
 */
export function calculateMargin(cost: Money, rate: string): Money {
  const rateVal = parseDecimal(rate);
  const oneVal = parseDecimal("1");
  if (rateVal < 0n) throw new MarginRateError(rate);
  if (rateVal >= oneVal) throw new MarginRateError(rate);
  const denom = addDecimal("1", multiplyDecimal("-1", rate));
  const sellAmount = divideDecimal(cost.amount, denom, 10);
  const adjustmentAmount = addDecimal(sellAmount, multiplyDecimal("-1", cost.amount));
  return { amount: adjustmentAmount, currency: cost.currency };
}

/**
 * Dispatch adjustment calculation based on kind.
 * Returns the adjustment AMOUNT (not the total).
 */
export function calculateAdjustment(adj: EstimateAdjustment, basis: Money): Money {
  switch (adj.kind) {
    case "fixed":
      return { amount: adj.amount.amount, currency: adj.amount.currency };
    case "markup":
      return calculateMarkup(basis, adj.rate);
    case "margin":
      return calculateMargin(basis, adj.rate);
    case "tax":
      return calculateMarkup(basis, adj.rate);
    default: {
      const _exhaustive: never = adj;
      throw new Error(`Unknown adjustment kind: ${String((_exhaustive as { kind: string }).kind)}`);
    }
  }
}

// ─── Line totals ──────────────────────────────────────────────────────────────

export function calculateLineTotals(
  input: EstimateLineInput,
  currency: string
): EstimateLineTotals {
  const grossQuantity = calculateGrossQuantity(input.quantity, input.wastePercent);
  const materialCost = calculateMaterialCost(grossQuantity, input.unitMaterialCost, currency);
  const laborHours = calculateLaborHours(input.quantity, input.laborHoursPerUnit);
  const laborCost = calculateLaborCost(laborHours, input.burdenedLaborRate, currency);
  const equipmentCost = calculateEquipmentCost(input.quantity, input.unitEquipmentCost, currency);
  const subcontractCost = calculateSubcontractCost(input.quantity, input.unitSubcontractCost, currency);
  const otherCost = calculateOtherCost(input.quantity, input.unitOtherCost, currency);

  // Stage 1: round directCost to 4dp
  const rawDirect = calculateDirectCost(
    materialCost, laborCost, equipmentCost, subcontractCost, otherCost
  );
  const directCost = roundMoney4dp(rawDirect);

  // Round individual cost components to 4dp for reporting
  return {
    grossQuantity,
    materialCost: roundMoney4dp(materialCost),
    laborHours,
    laborCost: roundMoney4dp(laborCost),
    equipmentCost: roundMoney4dp(equipmentCost),
    subcontractCost: roundMoney4dp(subcontractCost),
    otherCost: roundMoney4dp(otherCost),
    directCost,
  };
}
