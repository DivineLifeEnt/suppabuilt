import type { Money } from "./types";
import {
  parseDecimal,
  formatDecimal,
  addDecimal,
  multiplyDecimal,
} from "@/lib/takeoff/decimal";

export const CALCULATION_POLICY_VERSION = "1";

// Minor unit counts for ISO 4217 currencies
const MINOR_UNITS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, CAD: 2, AUD: 2, CHF: 2, MXN: 2,
  JPY: 0, KRW: 0, VND: 0, CLP: 0, PYG: 0,
  BHD: 3, KWD: 3, OMR: 3,
};

function minorUnits(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

/**
 * Parse a decimal amount string and currency into a Money value.
 * Validates that amount is a valid decimal string.
 */
export function parseMoney(amount: string, currency: string): Money {
  // Validate by trying to parse — throws on invalid
  parseDecimal(amount);
  if (typeof currency !== "string" || currency.length !== 3) {
    throw new Error(`Invalid currency: "${currency}"`);
  }
  return { amount, currency: currency.toUpperCase() };
}

/**
 * Add two Money values. Throws if currencies differ.
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot add ${a.currency} and ${b.currency}: currency mismatch`
    );
  }
  return { amount: addDecimal(a.amount, b.amount), currency: a.currency };
}

/**
 * Multiply a Money value by a decimal factor string.
 * factor is a decimal string (e.g. "1.2").
 */
export function multiplyMoney(m: Money, factor: string): Money {
  return { amount: multiplyDecimal(m.amount, factor), currency: m.currency };
}

/**
 * Round a Money value to its currency's minor units.
 * Stage 4 rounding: to currency minor units.
 */
export function roundMoney(m: Money): Money {
  const dp = minorUnits(m.currency);
  const scaled = parseDecimal(m.amount);
  // FACTOR = 10^10. To round to dp decimal places, divide by 10^(10-dp), round, multiply back.
  const FACTOR = 10n ** 10n;
  const roundingFactor = 10n ** BigInt(10 - dp);
  // Round half-up
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const truncated = abs / roundingFactor;
  const remainder = abs % roundingFactor;
  const halfFactor = roundingFactor / 2n;
  const rounded = remainder >= halfFactor ? truncated + 1n : truncated;
  const result = (negative ? -rounded : rounded) * roundingFactor;
  return { amount: formatDecimal(result, dp), currency: m.currency };
  void FACTOR;
}

/**
 * Round to 4 decimal places (stage 1+2 rounding for line and section subtotals).
 */
export function roundMoney4dp(m: Money): Money {
  const scaled = parseDecimal(m.amount);
  const dp = 4;
  const roundingFactor = 10n ** BigInt(10 - dp);
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const truncated = abs / roundingFactor;
  const remainder = abs % roundingFactor;
  const halfFactor = roundingFactor / 2n;
  const rounded = remainder >= halfFactor ? truncated + 1n : truncated;
  const result = (negative ? -rounded : rounded) * roundingFactor;
  return { amount: formatDecimal(result, dp), currency: m.currency };
}

/**
 * Round to 2 decimal places (stage 3 rounding for adjustment amounts).
 */
export function roundMoney2dp(m: Money): Money {
  const scaled = parseDecimal(m.amount);
  const dp = 2;
  const roundingFactor = 10n ** BigInt(10 - dp);
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const truncated = abs / roundingFactor;
  const remainder = abs % roundingFactor;
  const halfFactor = roundingFactor / 2n;
  const rounded = remainder >= halfFactor ? truncated + 1n : truncated;
  const result = (negative ? -rounded : rounded) * roundingFactor;
  return { amount: formatDecimal(result, dp), currency: m.currency };
}

/**
 * Format a Money value for display only. Never use for calculation.
 */
export function formatMoney(m: Money, locale = "en-US"): string {
  const rounded = roundMoney(m);
  const num = parseFloat(rounded.amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: m.currency,
      minimumFractionDigits: minorUnits(m.currency),
      maximumFractionDigits: minorUnits(m.currency),
    }).format(num);
  } catch {
    return `${m.currency} ${rounded.amount}`;
  }
}

export function zeroMoney(currency: string): Money {
  return { amount: "0", currency };
}
